import os
import json
import asyncio
from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
from dotenv import load_dotenv
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

load_dotenv()

app = Flask(__name__)
CORS(app)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
KAPRUKA_MCP_URL = "https://mcp.kapruka.com/mcp"

SYSTEM_PROMPT = """You are Kapi 🛍️ - a friendly AI shopping assistant for Kapruka.com, Sri Lanka's leading online shopping platform.

You help customers:
- Find products and gifts
- Get delivery quotes to any Sri Lankan district  
- Add items to cart
- Complete purchases with payment links
- Track existing orders

LANGUAGE: Respond in the same language the user uses:
- If they write in Sinhala → reply in Sinhala
- If they write in English → reply in English  
- If they write in Singlish/Tanglish → reply in Singlish
- Always be warm, friendly, and helpful like a local Sri Lankan shop assistant

GIFT DISCOVERY: When someone wants to buy a gift, always ask:
1. කාටද? (Who is it for?)
2. Occasion එක මොකද? (Birthday/Anniversary/etc?)
3. Budget එක කීයද? (What's the budget?)

IMPORTANT - TOOL USAGE RULES:
- For kapruka_search_products: limit must be integer (use 10), min_price/max_price must be number or null, in_stock_only must be boolean (true/false not string), cursor must be null if not paginating
- For kapruka_list_categories: depth must be integer (use 1 or 2)
- Always use proper types, never pass strings where numbers/booleans are needed
- When searching, always use response_format: "markdown"

TOOLS: Always use tools to search for real products - never make up product names or prices.
Be conversational, helpful, and make shopping fun! 🎉"""


def fix_tool_args(tool_name: str, args: dict) -> dict:
    """Fix type mismatches between LLM output and MCP schema"""
    fixed = dict(args)
    
    if tool_name == "kapruka_search_products":
        # Fix limit: string → int
        if "limit" in fixed:
            try:
                fixed["limit"] = int(fixed["limit"]) if fixed["limit"] not in (None, "null", "") else 10
            except:
                fixed["limit"] = 10
        else:
            fixed["limit"] = 10
            
        # Fix min_price/max_price: string → float or None
        for price_key in ["min_price", "max_price"]:
            if price_key in fixed:
                val = fixed[price_key]
                if val in (None, "null", "", "None"):
                    fixed[price_key] = None
                else:
                    try:
                        fixed[price_key] = float(val)
                    except:
                        fixed[price_key] = None
                        
        # Fix in_stock_only: string → bool
        if "in_stock_only" in fixed:
            val = fixed["in_stock_only"]
            if isinstance(val, bool):
                pass
            elif isinstance(val, str):
                fixed["in_stock_only"] = val.lower() == "true"
            else:
                fixed["in_stock_only"] = False
                
        # Fix cursor: "null" string → None
        if "cursor" in fixed and fixed["cursor"] in ("null", "None", ""):
            fixed["cursor"] = None
            
        # Fix include_stubs: string → bool
        if "include_stubs" in fixed:
            val = fixed["include_stubs"]
            if isinstance(val, bool):
                pass
            elif isinstance(val, str):
                fixed["include_stubs"] = val.lower() == "true"
            else:
                fixed["include_stubs"] = False

    elif tool_name == "kapruka_list_categories":
        # Fix depth: string → int
        if "depth" in fixed:
            try:
                fixed["depth"] = int(fixed["depth"]) if fixed["depth"] not in (None, "null", "") else 1
            except:
                fixed["depth"] = 1
        else:
            fixed["depth"] = 1
            
        # Fix cursor: "null" string → None  
        if "cursor" in fixed and fixed["cursor"] in ("null", "None", ""):
            fixed["cursor"] = None

    elif tool_name == "kapruka_get_delivery_quote":
        # Fix quantity: string → int
        if "quantity" in fixed:
            try:
                fixed["quantity"] = int(fixed["quantity"]) if fixed["quantity"] not in (None, "null", "") else 1
            except:
                fixed["quantity"] = 1

    return fixed


async def get_mcp_tools():
    try:
        async with streamablehttp_client(KAPRUKA_MCP_URL) as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                tools_result = await session.list_tools()
                tools = []
                for tool in tools_result.tools:
                    tools.append({
                        "type": "function",
                        "function": {
                            "name": tool.name,
                            "description": tool.description,
                            "parameters": tool.inputSchema if tool.inputSchema else {"type": "object", "properties": {}}
                        }
                    })
                return tools
    except Exception as e:
        print(f"MCP tools fetch error: {e}")
        return []


async def call_mcp_tool(tool_name: str, tool_args: dict):
    try:
        async with streamablehttp_client(KAPRUKA_MCP_URL) as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool(tool_name, tool_args)
                if result.content:
                    return result.content[0].text if hasattr(result.content[0], 'text') else str(result.content[0])
                return "No result returned"
    except Exception as e:
        print(f"MCP tool call error: {e}")
        return f"Error calling tool: {str(e)}"


def run_async(coro):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "Kapi backend is running! 🛍️"})


@app.route("/api/tools", methods=["GET"])
def list_tools():
    tools = run_async(get_mcp_tools())
    return jsonify({"tools": tools, "count": len(tools)})


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.json
    messages = data.get("messages", [])
    
    if not messages:
        return jsonify({"error": "No messages provided"}), 400

    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
    tools = run_async(get_mcp_tools())

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=full_messages,
            tools=tools if tools else None,
            tool_choice="auto" if tools else None,
            max_tokens=2048,
            temperature=0.7,
        )

        message = response.choices[0].message
        tool_calls_made = []
        max_iterations = 5
        iteration = 0

        while message.tool_calls and iteration < max_iterations:
            iteration += 1
            tool_results = []

            for tool_call in message.tool_calls:
                tool_name = tool_call.function.name
                raw_args = json.loads(tool_call.function.arguments)
                
                # Fix type mismatches
                tool_args = fix_tool_args(tool_name, raw_args)
                
                print(f"🔧 Tool: {tool_name}")
                print(f"   Raw args: {raw_args}")
                print(f"   Fixed args: {tool_args}")

                result = run_async(call_mcp_tool(tool_name, tool_args))

                tool_calls_made.append({
                    "tool": tool_name,
                    "args": tool_args,
                    "result_preview": str(result)[:200]
                })

                tool_results.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": str(result)
                })

            full_messages.append({
                "role": "assistant",
                "content": message.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments
                        }
                    }
                    for tc in message.tool_calls
                ]
            })

            full_messages.extend(tool_results)

            response = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=full_messages,
                tools=tools if tools else None,
                tool_choice="auto" if tools else None,
                max_tokens=2048,
                temperature=0.7,
            )
            message = response.choices[0].message

        return jsonify({
            "reply": message.content,
            "tool_calls": tool_calls_made,
            "usage": {
                "input_tokens": response.usage.prompt_tokens,
                "output_tokens": response.usage.completion_tokens
            }
        })

    except Exception as e:
        print(f"Chat error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("🛍️ Kapi - Kapruka AI Agent starting...")
    print(f"📡 MCP Server: {KAPRUKA_MCP_URL}")
    app.run(debug=True, port=5000)