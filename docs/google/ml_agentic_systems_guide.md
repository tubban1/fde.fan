# ML DOMAIN INTERVIEW: PRODUCTION-GRADE AGENTIC SYSTEMS
# ML 领域面试：生产级智能体系统
## Google Forward Deployed Engineer - Applied AI
## Google 前瞻部署工程师 - 应用 AI
## Quick Reference Guide
## 快速参考指南

---

# THE 5 PILLARS
# 五大支柱

## 1. Modular Orchestration
## 1. 模块化编排

**Core Pattern (核心模式):**
```
User Query → Router/Orchestrator → Specialized Agent → Tools → Response
用户查询 → 路由/编排器 → 专用智能体 → 工具 → 响应
```

**Key Points (关键点):**
- Central router classifies intent and delegates to specialist agents (中央路由器对意图进行分类并分配给专门的智能体)
- Each agent has SINGLE responsibility (separation of concerns) (每个智能体只承担单一职责，即关注点分离)
- Agents are composable — can call other agents if needed (智能体是可组合的 —— 必要时可以调用其他智能体)
- Tools are deterministic functions agents can invoke (APIs, DBs, calculators) (工具是智能体可调用的确定性函数，如 API、数据库、计算器)

**Architecture Example (架构示例):**
```
┌─────────────────────────────────────────┐
│              Orchestrator               │
│  (classifies intent, routes, manages)   │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌───────┐ ┌────────┐ ┌─────────┐
│Search │ │ Code   │ │ Summary │
│ Agent │ │ Agent  │ │  Agent  │
└───┬───┘ └───┬────┘ └────┬────┘
    │         │           │
    ▼         ▼           ▼
┌───────┐ ┌────────┐ ┌─────────┐
│Google │ │Python  │ │  LLM    │
│  API  │ │Sandbox │ │  Call   │
└───────┘ └────────┘ └─────────┘
```

**Frameworks (常见框架):**
- LangGraph — Graph-based agent orchestration (基于图的智能体编排)
- CrewAI — Role-based multi-agent framework (基于角色的多智能体框架)
- AutoGen — Microsoft's multi-agent conversation framework (微软的多智能体对话框架)
- LangChain — General-purpose LLM orchestration (通用 LLM 编排框架)

**What to Say (面试怎么说):**
> "I'd design this with a central orchestrator that maintains conversation state and routes
> to specialized agents. Each agent has a focused capability — one for retrieval, one for
> code execution, one for summarization. This modularity makes testing easier and allows
> us to swap or upgrade individual agents without touching others."
>
> “我会设计一个维持对话状态并路由给专用智能体的中央编排器。每个智能体都有其专注的能力——比如一个负责检索，一个负责执行代码，一个负责总结。这种模块化设计让测试变得更容易，并且允许我们在不影响其他模块的情况下替换或升级单个智能体。”

---

## 2. Deterministic Reliability
## 2. 确定性与可靠性

**Problem (问题):** LLMs are probabilistic — same input can give different outputs. (大模型是概率性的，相同的输入可能会给出不同的输出。)

**Solutions (解决方案):**

### Structured Outputs (结构化输出)
```python
from pydantic import BaseModel

class ToolCall(BaseModel):
    tool_name: str
    parameters: dict
    confidence: float  # 0.0 - 1.0

class AgentResponse(BaseModel):
    thought: str
    action: ToolCall | None
    final_answer: str | None

# Force LLM to return valid schema (强制大模型返回符合规范的 Schema)
response = llm.generate(prompt, response_format=AgentResponse)
```

### Retry Logic (重试逻辑)
```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10)
)
def call_external_api(query: str):
    return api.search(query)
```

### Validation & Fallbacks (验证与降级回调)
```python
def execute_tool(tool_call: ToolCall):
    try:
        result = tools[tool_call.tool_name].run(tool_call.parameters)
        if not validate_result(result):
            raise InvalidResultError()
        return result
    except ToolNotFoundError:
        return "I don't have access to that tool. Let me try another approach."
    except TimeoutError:
        return "The service is slow. Here's what I know from cached data..."
    except Exception as e:
        log_error(e)
        return "I encountered an issue. Could you rephrase your request?"
```

**What to Say (面试怎么说):**
> "For reliability, I enforce strict schemas using Pydantic for all LLM outputs. If the
> response doesn't parse, we retry with a clarified prompt. For tool calls, we wrap everything
> in retry logic with exponential backoff, and we have graceful fallbacks when things fail.
> The system should never crash — it should degrade gracefully and communicate clearly."
>
> “为了保证可靠性，我会在所有大模型输出上使用 Pydantic 强制执行严格的 Schema 规范。如果返回结果无法解析，我们会用更明确的 Prompt 进行重试。对于工具调用，我们会用指数退避算法将其封装在重试逻辑中，并且在失败时具备优雅的降级回调处理。系统永远不应该崩溃——它应该优雅地降级并给予用户清晰的反馈。”

---

## 3. Context Optimization
## 3. 上下文优化

**Problem (问题):** LLMs have limited context windows. Long conversations or large documents don't fit. (大模型的上下文窗口有限，长对话或大文档无法完全装入。)

**Solutions (解决方案):**

### Memory Compression (记忆压缩)
```python
class ConversationMemory:
    def __init__(self, max_tokens=4000):
        self.messages = []
        self.summary = ""
        self.max_tokens = max_tokens
    
    def add_message(self, role, content):
        self.messages.append({"role": role, "content": content})
        
        if self.token_count() > self.max_tokens:
            self._compress()
    
    def _compress(self):
        # Keep last 5 messages, summarize the rest (保留最后5条消息，其余的进行总结压缩)
        old_messages = self.messages[:-5]
        self.summary = llm.summarize(self.summary + str(old_messages))
        self.messages = self.messages[-5:]
    
    def get_context(self):
        return f"Previous context: {self.summary}\n\nRecent messages: {self.messages}"
```

### RAG (Retrieval Augmented Generation / 检索增强生成)
```python
# Indexing (建立索引)
def index_documents(docs: list[str]):
    embeddings = embedding_model.encode(docs)
    vector_db.upsert(embeddings, docs)

# Retrieval (检索)
def retrieve_context(query: str, top_k=5):
    query_embedding = embedding_model.encode(query)
    results = vector_db.search(query_embedding, top_k=top_k)
    return results

# Generation (生成)
def generate_response(query: str):
    context = retrieve_context(query)
    prompt = f"Context: {context}\n\nQuestion: {query}"
    return llm.generate(prompt)
```

**Vector DBs to Know (必须了解的向量数据库):**
- Pinecone — Managed, easy to scale (全托管，易于横向扩展)
- Weaviate — Open source, GraphQL API (开源，支持 GraphQL API)
- Chroma — Lightweight, good for prototyping (轻量级，非常适合做原型设计)
- FAISS — Facebook's library, great for local/fast search (Facebook 出品的库，非常适合本地/快速搜索)
- Qdrant — Rust-based, performant (基于 Rust 开发，性能极佳)

**What to Say (面试怎么说):**
> "For context optimization, I use a tiered approach. Recent messages stay in full,
> older conversation gets progressively summarized. For knowledge bases, I use RAG —
> embed documents into a vector DB like Pinecone, then retrieve only the top-k most
> relevant chunks for each query. This keeps context focused and costs down."
> 
> “针对上下文优化，我通常采用分层处理。最近的消息保留原文，较早的对话则逐步被压缩为总结摘要。对于知识库，我使用 RAG 技术——将文档嵌入成向量并存入像 Pinecone 这样的向量数据库，然后针对每个查询只检索最相关的 Top-K 块。这能让模型更专注于有效上下文，并降低开销成本。”

---

## 4. Operational Guardrails
## 4. 运营与安全护栏

**Problem (问题):** Agents can loop infinitely, take dangerous actions, or burn through API costs. (智能体可能会陷入死循环、执行危险操作，或耗尽 API 预算。)

**Solutions (解决方案):**

### Circuit Breakers (熔断机制)
```python
class AgentRunner:
    def __init__(self, max_iterations=10, max_tokens=10000, timeout_seconds=60):
        self.max_iterations = max_iterations
        self.max_tokens = max_tokens
        self.timeout = timeout_seconds
    
    def run(self, task: str):
        iterations = 0
        tokens_used = 0
        start_time = time.time()
        
        while not task_complete:
            # Circuit breaker checks (熔断检查)
            if iterations >= self.max_iterations:
                return "Reached maximum iterations. Here's my best answer so far..."
            
            if tokens_used >= self.max_tokens:
                return "Reached token budget. Summarizing what I found..."
            
            if time.time() - start_time > self.timeout:
                return "Taking too long. Here's a partial response..."
            
            # Execute step (执行步骤)
            result, tokens = self.execute_step()
            tokens_used += tokens
            iterations += 1
```

### Human-in-the-Loop (人类介入反馈机制)
```python
DANGEROUS_ACTIONS = ["delete", "purchase", "send_email", "execute_code", "modify_production"]

def execute_action(action: Action):
    if action.type in DANGEROUS_ACTIONS:
        # Pause and ask for confirmation (暂停并要求人类确认)
        approved = request_human_approval(
            action=action,
            reason="This action has side effects",
            timeout_minutes=5
        )
        if not approved:
            return "Action cancelled by user."
    
    return action.execute()
```

### Cost Controls (成本控制)
```python
class CostTracker:
    def __init__(self, budget_per_session=1.00):  # $1 max
        self.budget = budget_per_session
        self.spent = 0.0
    
    def track_call(self, model: str, input_tokens: int, output_tokens: int):
        cost = calculate_cost(model, input_tokens, output_tokens)
        self.spent += cost
        
        if self.spent >= self.budget:
            raise BudgetExceededError(f"Session budget of ${self.budget} exceeded")
```

**What to Say (面试怎么说):**
> "Production agents need strict guardrails. I implement circuit breakers that cap iterations,
> tokens, and wall-clock time. Any destructive action — deletes, purchases, external sends —
> requires explicit human approval. We also track costs per session and per user to prevent
> runaway spending. The agent should be safe to leave running without supervision."
> 
> “生产级智能体需要极其严格的护栏。我会实施熔断机制，对迭代次数、Token 消耗总量和绝对执行时间设定上限。任何破坏性或有副作用的操作——比如删除数据、购买交易、对外发信——都必须有明确的人类授权 (Human-in-the-loop)。此外，我们还要追踪单次会话与单个用户的成本，以防止预算失控。我们的目标是，智能体应当安全到能在无人监督的情况下独立运行。”

---

## 5. Systematic Evaluation
## 5. 系统化评估体系

**Problem (问题):** "Vibe checks" don't scale. Need automated, reproducible quality measurement. (光靠“肉眼找感觉”的验证方式无法规模化。需要自动化的、可复现的质量测量手段。)

**Solutions (解决方案):**

### Golden Datasets (黄金测试集)
```python
GOLDEN_TESTS = [
    {
        "input": "What's the capital of France?",
        "expected": "Paris",
        "criteria": ["factually_correct", "concise"]
    },
    {
        "input": "Summarize this 10-page document",
        "expected_criteria": ["captures_main_points", "under_500_words", "no_hallucinations"],
        "reference_doc": "doc_123.pdf"
    },
]

def run_golden_tests():
    results = []
    for test in GOLDEN_TESTS:
        output = agent.run(test["input"])
        score = evaluate(output, test)
        results.append({"test": test["input"], "score": score, "output": output})
    return results
```

### LLM-as-Judge (用大模型做裁判)
```python
JUDGE_PROMPT = """
Rate the following response on these criteria (1-5 each):
1. Relevance: Does it answer the question?
2. Accuracy: Is the information correct?
3. Clarity: Is it easy to understand?
4. Completeness: Does it fully address the query?

Question: {question}
Response: {response}

Return JSON: {"relevance": X, "accuracy": X, "clarity": X, "completeness": X, "reasoning": "..."}
"""

def llm_judge(question: str, response: str) -> dict:
    judgment = gpt4.generate(JUDGE_PROMPT.format(question=question, response=response))
    return json.loads(judgment)
```

### Evaluation Pipeline (自动化评估流水线)
```python
def nightly_eval_pipeline():
    # 1. Run all golden tests (运行所有黄金测试用例)
    results = run_golden_tests()
    
    # 2. Calculate aggregate metrics (计算汇总指标)
    metrics = {
        "success_rate": sum(r["passed"] for r in results) / len(results),
        "avg_latency": mean(r["latency"] for r in results),
        "avg_cost": mean(r["cost"] for r in results),
        "avg_judge_score": mean(r["judge_score"] for r in results),
    }
    
    # 3. Compare to baseline (与基线对比)
    regression = detect_regression(metrics, previous_metrics)
    
    # 4. Alert if needed (视需要发出告警)
    if regression:
        send_alert(f"Regression detected: {regression}")
    
    # 5. Log to dashboard (日志记录至仪表盘)
    log_metrics(metrics)
```

**Key Metrics (关键指标):**
- Task success rate (binary: did it complete the task?) (任务成功率 - 是否完成了任务)
- Factual accuracy (via ground truth comparison or LLM judge) (事实准确度 - 通过 Ground Truth 或大模型裁判打分)
- Latency (p50, p95, p99) (延迟情况)
- Cost per query (每次查询的成本)
- User satisfaction (thumbs up/down, explicit ratings) (用户满意度 - 点赞/踩 或 打分)

**What to Say (面试怎么说):**
> "We move beyond vibe checks with systematic evaluation. We maintain golden datasets —
> curated test cases with expected outputs. Every PR runs against these. For subjective
> quality, we use LLM-as-judge with GPT-4 scoring on relevance, accuracy, and completeness.
> Nightly pipelines track metrics over time and alert on regressions. This catches issues
> before users do."
> 
> “我们需要跨越主观感觉阶段，建立系统化的评估机制。我们会维护‘黄金测试集’——那些拥有预期输出的精选测试用例。每一个合并请求 (PR) 都会在这上面运行以防退化。对于主观质量判断，我们利用 GPT-4 作为裁判 (LLM-as-judge)，在相关性、准确度和完整性上进行打分。每晚自动运行的评估流水线会跟踪这些长期指标并在能力退化时发出告警，这样可以在触达真实用户前将问题截断。”

---

# PUTTING IT ALL TOGETHER
# 融会贯通

**Sample System Design Answer (系统设计面试参考回答):**

"If I were building a customer support agent for an e-commerce platform, here's how I'd approach it:
如果让我为一个电商平台构建一个客服智能体，我会这样设计：

**Orchestration (编排层):** Central router classifies tickets into categories — order status, returns, product questions, complaints. Each routes to a specialized agent with access to relevant tools (order DB, return policy docs, product catalog).
中央路由首先将工单分为：订单状态、退换货、产品咨询、投诉。每一种都被路由到拥有对应工具（订单数据库查询、退款政策文档检索、产品目录查询）的专用智能体处理。

**Reliability (可靠性):** All agent outputs use Pydantic schemas. Tool calls have retry logic with exponential backoff. If the order API is down, we gracefully tell the user we're checking and will follow up.
所有智能体的输出都被 Pydantic Schema 强行约束。工具调用具有带有指数退避机制的重试逻辑。如果订单 API 宕机了，我们会优雅地告诉用户‘系统正在排查，后续会跟进通知’。

**Context (上下文):** Customer history is stored in a vector DB. When a ticket comes in, we retrieve relevant past interactions and order history. Long conversations get summarized every 10 turns.
顾客的历史记录储存在向量数据库中。当新工单进来时，我们直接检索该顾客过去最相关的互动和订单历史。如果单次对话过长，每隔 10 轮交互就触发一次总结压缩。

**Guardrails (安全护栏):** Refund approvals over $100 require human review. Agents can't access other customers' data. We cap each session at 20 iterations and $0.50 in API costs.
超过 100 美元的退款审批操作必须经由人工审核。智能体无权访问其他客户的数据。我们还将每次会话的迭代上限锁定在 20 次以内，并且单次 API 成本不得超过 0.5 美元。

**Evaluation (评估机制):** We have 500 golden tickets with labeled correct resolutions. Nightly evals measure resolution accuracy, customer satisfaction scores, and average handle time. Any regression >3% blocks deployment."
我们在后台维护了 500 个标有正确处理方式的黄金标准工单用例。每日深夜的自动化评估会测量问题解决率、顾客体验打分以及平均处理时间。任何超过 3% 的能力退化表现都会直接阻断当次代码部署。

---

# QUICK REFERENCE: TOOLS & FRAMEWORKS
# 快速参考：工具与框架

| Category (类别) | Tools (工具) |
|----------|-------|
| Orchestration (编排) | LangGraph, LangChain, CrewAI, AutoGen |
| Vector DBs (向量数据库) | Pinecone, Weaviate, Chroma, FAISS, Qdrant |
| Structured Output (结构化输出) | Pydantic, Instructor, OpenAI function calling |
| Observability (可观测性) | LangSmith, Weights & Biases, Arize |
| Evaluation (模型评估) | RAGAS, DeepEval, custom LLM-as-judge |

---

# QUESTIONS THEY MIGHT ASK
# 面试官可能会问的陷阱问题

1. "How would you handle an agent that keeps looping?" (你该如何处理陷入无限死循环的智能体？)
   → Circuit breakers, iteration limits, loop detection (设置熔断机制、设置最大迭代上限、加入死循环检测)

2. "How do you ensure the agent doesn't hallucinate?" (你如何确保你的智能体不会产生幻觉？)
   → RAG with citations, confidence scores, fact-checking tools (要求基于 RAG 检索并附带引用来源，输出置信度分数，并辅以事实核查工具)

3. "How would you evaluate if your agent is improving?" (你怎样客观评估你的智能体版本在持续进化？)
   → Golden datasets, LLM-as-judge, A/B testing, user feedback metrics (建立黄金测试集、用大模型打分、AB测试，以及建立用户反馈闭环)

4. "What happens when an external API fails?" (当外部 API 大面积崩溃时你的系统会怎样？)
   → Retry with backoff, fallback to cached data, graceful error messages (采用指数退避重试，平滑降级使用本地缓存数据，并为用户提供优雅清晰的报错提示)

5. "How do you manage costs at scale?" (在大规模并发请求下你如何控制成本？)
   → Token budgets per session, caching frequent queries, smaller models for simple tasks (为单次会话设定强制的 Token 预算限制，采用语义缓存应对高频重复提问，并在处理简单任务时降级使用轻量级小模型)

---

# YOUR EXPERIENCE TO HIGHLIGHT
# 结合自身经历的话术重点

Based on your past projects (Prophet forecasting, clinical dashboards, data pipelines):
基于你过往的经历（Prophet预测模型、临床仪表盘、数据管道）：

- "In my forecasting pipeline, I built similar reliability patterns — retry logic, 
   validation checks, graceful degradation when data sources were unavailable."
   “在我的预测管道项目中，我构建过非常类似的可靠性模式 —— 重试逻辑、数据校验，以及当上游数据源不可用时的优雅降级。”

- "I understand production systems. I've built pipelines that need to run reliably
   without human intervention, with proper error handling and monitoring."
   “我非常了解生产级系统该有的样子。我构建过必须在无人工干预下可靠运行的数据管道，它们包含了极为完善的错误捕获与监控体系。”

- "I've worked with structured data and schemas extensively, which translates directly
   to enforcing structured outputs from LLMs."
   “我在高度结构化数据和 Schema 设计方面有着极其丰富的经验，这种经验可以直接平移运用到如何强制约束大模型输出严格结构化数据上。”

Connect your experience to these pillars. You have more relevant background than you might think.
务必把你过去的经历与本文提到的五大支柱紧密相连。你在这方面的背景远比你自认为的要强大得多。
