from fastapi import APIRouter, HTTPException
from functools import wraps
from typing import Optional
import re
import uuid
from datetime import datetime

from models import ChatRequest, ChatResponse
from memory import memory
from agents import RiskAgent, RiskCoder, RiskPlanner, ollama_client
from tools import FileTools, TerminalTools, github_tools
from config.settings import settings

router = APIRouter(prefix="/api", tags=["chat"])

risk_agent = RiskAgent()
risk_coder = RiskCoder()
risk_planner = RiskPlanner()


def handle_errors(func):
    """Convert unexpected exceptions raised by a route handler into a 500 HTTPException."""

    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return wrapper


def extract_command(message: str) -> Optional[str]:
    """Phat hien lenh shell trong tin nhan chat."""
    text = message.strip()

    fence = re.search(r"```(?:bash|sh)\s*\n(.*?)```", text, re.DOTALL)
    if fence:
        return fence.group(1).strip()

    if text.startswith("!"):
        return text[1:].strip()

    return None


def _chat_response(conversation_id: str, message: str, tool_calls: Optional[list] = None) -> ChatResponse:
    """Build a ChatResponse and persist the assistant reply to memory."""
    memory.add_message(conversation_id, "assistant", message)
    return ChatResponse(
        conversation_id=conversation_id,
        message=message,
        tool_calls=tool_calls or [],
        timestamp=datetime.now(),
        model=ollama_client.model,
    )


@router.post("/chat", response_model=ChatResponse)
@handle_errors
async def chat(request: ChatRequest):
    """Main chat endpoint - send message and get AI response"""
    memory.create_conversation(request.conversation_id, title=None)
    memory.add_message(request.conversation_id, "user", request.message)

    if request.use_tools:
        command = extract_command(request.message)
        if command:
            if not settings.enable_terminal_tool:
                denied = (
                    "Terminal tool dang bi tat. Dat ENABLE_TERMINAL_TOOL=true "
                    "trong backend/.env de cho phep chay lenh."
                )
                return _chat_response(request.conversation_id, denied)

            result = TerminalTools.execute_command(command, timeout=30, sandbox=True)
            output = (
                f"$ {command}\n"
                f"[exit code: {result['returncode']}]\n\n"
                f"--- stdout ---\n{result['stdout']}\n"
                f"--- stderr ---\n{result['stderr']}"
            )
            tool_calls = [{"tool": "terminal", "command": command, "result": result}]
            return _chat_response(request.conversation_id, output, tool_calls)

    system_prompt = request.system_prompt or """You are Risk AI, a helpful coding assistant inspired by GitHub Copilot and OpenAI's Codex.
You can read code, write code, execute commands, and interact with GitHub.
Be concise and helpful."""

    response = ollama_client.generate(
        prompt=request.message,
        system=system_prompt,
        temperature=0.7,
        max_tokens=2048
    )

    if not response["success"]:
        raise HTTPException(status_code=500, detail=response["error"])

    return _chat_response(request.conversation_id, response["content"])


@router.get("/chat/{conversation_id}")
@handle_errors
async def get_conversation(conversation_id: str):
    """Get conversation history"""
    messages = memory.get_messages(conversation_id)
    return {
        "conversation_id": conversation_id,
        "messages": messages
    }

@router.post("/chat/{conversation_id}/new")
@handle_errors
async def new_conversation(conversation_id: str):
    """Create a new conversation"""
    conv_id = str(uuid.uuid4())
    memory.create_conversation(conv_id)
    return {"conversation_id": conv_id, "status": "created"}

@router.post("/tools/file/read")
@handle_errors
async def file_read(path: str):
    """Read file contents"""
    return FileTools.read_file(path)

@router.post("/tools/file/write")
@handle_errors
async def file_write(path: str, content: str):
    """Write to file"""
    return FileTools.write_file(path, content)

@router.post("/tools/terminal/execute")
@handle_errors
async def terminal_execute(command: str, timeout: int = 30, sandbox: bool = True):
    """Execute terminal command"""
    return TerminalTools.execute_command(command, timeout, sandbox)

@router.get("/tools/github/repo")
@handle_errors
async def github_get_repo(owner: str, repo: str):
    """Get GitHub repository info"""
    return github_tools.get_repo(owner, repo)

@router.get("/tools/github/issues")
@handle_errors
async def github_list_issues(owner: str, repo: str, state: str = "open"):
    """List GitHub issues"""
    return github_tools.list_issues(owner, repo, state)

@router.post("/agent/plan")
@handle_errors
async def agent_plan(task: str, context: Optional[str] = None):
    """Get agent plan for a task"""
    plan = risk_agent.plan(task, context)
    return plan.dict()

@router.post("/coder/analyze")
@handle_errors
async def coder_analyze(code: str, language: str = "python"):
    """Analyze code"""
    return risk_coder.analyze_code(code, language)

@router.post("/coder/generate")
@handle_errors
async def coder_generate(description: str, language: str = "python"):
    """Generate code from description"""
    return risk_coder.generate_code(description, language)

@router.post("/planner/decompose")
@handle_errors
async def planner_decompose(task: str, context: Optional[str] = None):
    """Decompose task into subtasks"""
    return risk_planner.decompose_task(task, context)

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "llm_model": ollama_client.model,
        "ollama_url": ollama_client.base_url
    }
