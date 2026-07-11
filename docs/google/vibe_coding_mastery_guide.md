# VIBE CODING INTERVIEW: COMPLETE MASTERY GUIDE
# Vibe Coding 面试：完全精通指南
## Google Forward Deployed Engineer - Applied AI
## Google 前瞻部署工程师 - 应用 AI
## Staff-Level AI-First Engineering Assessment
## Staff 级别 AI 优先工程评估

---

# PART 1: UNDERSTANDING THE PARADIGM SHIFT
# 第 1 部分：理解范式转变

## What is "Vibe Coding"?
## 什么是“Vibe Coding”？

Traditional coding: You write code line-by-line
传统编程：逐行编写代码
Vibe coding: You describe INTENT, AI generates implementation
Vibe 编程：描述“意图”，由 AI 生成具体实现

**Your role shifts from (你的角色将发生以下转变):**
- Code writer → Architectural orchestrator (代码编写者 → 架构编排者)
- Debugger → AI output validator (调试员 → AI 输出验证者)
- Implementer → System integrity guardian (执行者 → 系统完整性守护者)

## The New Value Stack
## 全新的价值栈

| Old Value (旧价值) | New Value (新价值) |
|-----------|-----------|
| Typing speed (打字速度) | Prompt precision (提示词精准度) |
| Syntax knowledge (语法知识) | Architectural thinking (架构思维) |
| Line-by-line debugging (逐行调试) | Intent-based diagnosis (基于意图的诊断) |
| Code review (代码审查) | Prompt + output review (提示词 + 输出审查) |
| Writing tests (编写测试) | Designing evaluators (设计评估器) |

## The Core Mindset
## 核心思维模式

> "In a post-syntax world, your value is maintaining systemic integrity, 
> security, and scalability while your team generates implementations at 10x speed."
> “在后语法时代，你的价值在于维护系统的完整性、安全性和可扩展性，同时你的团队以 10 倍的速度生成具体实现代码。”

You are not replaced by AI — you are ELEVATED to focus on what AI can't do:
你并没有被 AI 取代——而是被**提升**了，去专注于 AI 无法做到的事情：
- System-wide architectural consistency (全系统的架构一致性)
- Security and privacy enforcement (安全和隐私的强制执行)
- Failure mode anticipation (故障模式预判)
- Quality and correctness validation (质量和正确性验证)

---

# PART 2: THE FOUR CORE COMPETENCIES
# 第 2 部分：四大核心能力

## Competency 1: Modular Intent & Decomposition
## 能力一：模块化意图与任务拆解

### The Problem (痛点)
AI loses context and hallucinates when prompts are too large or vague.
当提示词过于庞大或模糊时，AI 容易丢失上下文并产生幻觉。

### The Solution: Decomposition Strategy (解决方案：拆解策略)

**Bad prompt (糟糕的提示词):**
```
"Build me a complete e-commerce platform with user auth, product catalog, 
shopping cart, checkout, payment processing, order management, and admin dashboard"
“给我建一个完整的电商平台，包含用户鉴权、产品目录、购物车、结账、支付处理、订单管理和管理员后台”
```

**Good decomposition (优秀的拆解):**
```
Module 1: Authentication Service (模块 1：鉴权服务)
- "Create a FastAPI auth service with JWT tokens, supporting email/password 
  login and registration. Include password hashing with bcrypt, token refresh 
  endpoint, and rate limiting of 5 requests/minute per IP."
  “使用 JWT 创建一个 FastAPI 鉴权服务，支持邮箱/密码登录与注册。要求包含 bcrypt 密码哈希、Token 刷新接口，以及每个 IP 每分钟 5 次的限流。”

Module 2: Product Catalog Service (模块 2：产品目录服务)
- "Create a FastAPI service for product management. Include CRUD endpoints, 
  pagination (20 items default), filtering by category and price range, 
  and full-text search using PostgreSQL."
  “创建一个 FastAPI 产品管理服务。包含增删改查 (CRUD) 接口，默认 20 条的分页，按类别和价格区间过滤，以及使用 PostgreSQL 的全文搜索。”

Module 3: Shopping Cart Service (模块 3：购物车服务)
- "Create a cart service that stores cart state in Redis with 24-hour TTL. 
  Include add/remove/update quantity endpoints. Cart should reference 
  product IDs and validate against catalog service."
  “创建一个购物车服务，将状态存储在 Redis 中，TTL 为 24 小时。包含添加/删除/修改数量的接口。购物车应引用产品 ID 并向产品目录服务进行验证。”

[Continue for each bounded context...]
[继续为每个限界上下文进行拆解...]
```

### The Decomposition Framework (拆解框架)

```
1. IDENTIFY BOUNDED CONTEXTS (识别限界上下文)
   - What are the distinct domains? (Auth, Products, Orders, Payments) (有哪些不同的领域？例如：鉴权、产品、订单、支付)
   - What data does each own? (各自拥有哪些数据？)
   - What are the interfaces between them? (它们之间的接口是什么？)

2. DEFINE CONTRACTS FIRST (优先定义契约)
   - API schemas (OpenAPI/Pydantic) (API 模式)
   - Data models (数据模型)
   - Event formats (if async) (事件格式，如果是异步的话)
   
3. PROMPT PER MODULE (按模块编写提示词)
   - One service = one prompt session (一个服务 = 一次提示词会话)
   - Include explicit constraints (包含明确的约束条件)
   - Reference the contracts (引用刚才定义的契约)

4. INTEGRATE AND VALIDATE (集成与验证)
   - Test interfaces between modules (测试模块间的接口)
   - Verify architectural consistency (验证架构一致性)
```

### Decomposition Checklist (拆解检查清单)

For each module prompt, include (在每个模块的提示词中，请包含):
- [ ] Clear boundary (what's in scope, what's not) (清晰的边界：什么是范围内的，什么不是)
- [ ] Input/output contracts (输入/输出契约)
- [ ] Technology constraints (framework, database, etc.) (技术栈约束：框架、数据库等)
- [ ] Performance requirements (latency, throughput) (性能要求：延迟、吞吐量)
- [ ] Security requirements (auth, validation, rate limiting) (安全要求：鉴权、校验、限流)
- [ ] Error handling expectations (错误处理预期)
- [ ] Integration points with other modules (与其他模块的集成点)

---

## Competency 2: Policy as Code

### The Problem
AI doesn't inherently know your organization's security policies, compliance requirements, or architectural standards.

### The Solution: Encode Policies in Prompts

**Security Policy Prompt Template:**
```
SECURITY REQUIREMENTS (apply to all generated code):
1. Authentication: All endpoints except /health require JWT validation
2. Authorization: Use RBAC with roles: admin, user, guest
3. Input Validation: All user input must be validated with Pydantic
4. SQL Injection: Use parameterized queries only, never string concatenation
5. PII Handling: 
   - Never log PII fields (email, phone, SSN, payment info)
   - Encrypt PII at rest using AES-256
   - Mask PII in error messages
6. Rate Limiting: 100 requests/minute per user, 1000/minute per IP
7. CORS: Only allow origins from approved list
8. Secrets: Never hardcode, always use environment variables
```

**Architectural Policy Prompt Template:**
```
ARCHITECTURAL STANDARDS (apply to all services):
1. Structure: Follow clean architecture (handlers → services → repositories)
2. Logging: Use structured JSON logging with correlation IDs
3. Errors: Return RFC 7807 problem details format
4. Health: Include /health and /ready endpoints
5. Metrics: Expose Prometheus metrics on /metrics
6. Config: Use environment variables with sensible defaults
7. Database: Use connection pooling, max 20 connections
8. Async: Use background tasks for operations > 100ms
```

### Creating a Policy Library

Build reusable policy snippets:

```python
# policies/security.py
SECURITY_POLICY = """
All code must follow these security requirements:
- Validate all inputs using Pydantic models
- Use parameterized queries for all database operations
- Hash passwords with bcrypt, minimum 12 rounds
- Generate tokens with secrets.token_urlsafe(32)
- Set secure cookie flags: HttpOnly, Secure, SameSite=Strict
- Implement rate limiting on all public endpoints
- Log security events but never log sensitive data
"""

# policies/api_standards.py
API_STANDARDS = """
All APIs must follow these standards:
- Use REST conventions (proper HTTP methods and status codes)
- Version APIs in URL path: /api/v1/
- Use snake_case for JSON fields
- Include pagination for list endpoints (limit/offset)
- Return consistent error format: {"error": {"code": "", "message": ""}}
- Include request_id in all responses for tracing
"""

# Usage in prompts:
prompt = f"""
{SECURITY_POLICY}
{API_STANDARDS}

Now create an endpoint for user registration...
"""
```

---

## Competency 3: Validation — "Testing is the New Coding"

### The Problem
AI-generated code can be subtly wrong in ways that pass traditional tests.

### The Solution: Multi-Layer Validation

**Layer 1: Static Analysis (Immediate)**
```bash
# Run on every AI-generated code block
ruff check .                    # Linting
mypy . --strict                 # Type checking
bandit -r .                     # Security scanning
semgrep --config=auto .         # Pattern-based security
```

**Layer 2: Contract Testing**
```python
# Validate AI output matches expected schema
from pydantic import BaseModel, ValidationError

class ExpectedUserResponse(BaseModel):
    id: str
    email: str
    created_at: datetime
    
def validate_ai_output(generated_code: str, test_input: dict):
    # Execute the generated code
    result = exec_generated_endpoint(generated_code, test_input)
    
    # Validate against contract
    try:
        ExpectedUserResponse(**result)
        return True
    except ValidationError as e:
        log_contract_violation(e)
        return False
```

**Layer 3: Behavioral Testing**
```python
# Test behaviors, not just outputs
class AIOutputBehaviorTests:
    
    def test_handles_empty_input(self):
        """AI often forgets edge cases"""
        result = endpoint({})
        assert result.status_code == 400
        assert "validation" in result.json()["error"]["message"].lower()
    
    def test_handles_malicious_input(self):
        """AI may not consider security"""
        result = endpoint({"email": "'; DROP TABLE users; --"})
        assert result.status_code == 400  # Should reject, not execute
    
    def test_handles_concurrent_requests(self):
        """AI often ignores concurrency"""
        results = await asyncio.gather(*[endpoint(data) for _ in range(100)])
        assert all(r.status_code == 200 for r in results)
    
    def test_respects_rate_limits(self):
        """AI may not implement rate limiting"""
        for _ in range(150):  # Exceed limit
            result = endpoint(data)
        assert result.status_code == 429
```

**Layer 4: Property-Based Testing**
```python
from hypothesis import given, strategies as st

@given(st.emails())
def test_accepts_any_valid_email(email):
    """AI should handle all valid email formats"""
    result = register_user({"email": email, "password": "ValidPass123!"})
    assert result.status_code in [200, 409]  # Success or already exists

@given(st.text(min_size=1000000))  # 1MB string
def test_handles_large_inputs(large_string):
    """AI often forgets input size limits"""
    result = endpoint({"description": large_string})
    assert result.status_code == 400  # Should reject, not crash
```

**Layer 5: LLM-as-Judge Evaluation**
```python
EVALUATION_PROMPT = """
You are a senior security engineer reviewing AI-generated code.

Evaluate this code for:
1. Security vulnerabilities (injection, auth bypass, data exposure)
2. Error handling completeness
3. Resource management (connections, memory, file handles)
4. Concurrency safety
5. Logging appropriateness (no PII, includes trace IDs)

Code to review:
```python
{generated_code}
```

Original prompt that generated it:
{original_prompt}

Return JSON:
{
    "security_score": 1-10,
    "reliability_score": 1-10,
    "issues": [{"severity": "high|medium|low", "description": "...", "fix": "..."}],
    "overall_assessment": "pass|fail|needs_review"
}
"""

def evaluate_ai_output(code: str, prompt: str) -> dict:
    result = llm.generate(EVALUATION_PROMPT.format(
        generated_code=code, 
        original_prompt=prompt
    ))
    return json.loads(result)
```

**Layer 6: Production Telemetry Validation**
```python
# Self-correcting systems based on production signals
class ProductionValidator:
    
    def __init__(self):
        self.error_rate_threshold = 0.01  # 1%
        self.latency_p99_threshold = 500  # ms
    
    async def monitor_and_correct(self, service_name: str):
        metrics = await get_service_metrics(service_name)
        
        if metrics.error_rate > self.error_rate_threshold:
            await alert_and_rollback(service_name)
            await trigger_prompt_review(service_name)
        
        if metrics.latency_p99 > self.latency_p99_threshold:
            await scale_up(service_name)
            await trigger_performance_review(service_name)
        
        # Log anomalies for prompt improvement
        if metrics.has_anomalies:
            await log_for_prompt_refinement(
                service_name, 
                metrics.anomaly_details
            )
```

---

## Competency 4: Diagnosing AI Failures (The Black Box Problem)

### The Problem
When AI-generated code fails, you can't just "step through the debugger" — the failure might be in the prompt, the model's interpretation, or emergent behavior.

### The Diagnostic Framework

**Step 1: Classify the Failure Type**

| Failure Type | Symptoms | Root Cause |
|--------------|----------|------------|
| Hallucination | Calls APIs that don't exist | Prompt lacked context about available libraries |
| Misinterpretation | Code works but does wrong thing | Ambiguous or incomplete prompt |
| Partial Implementation | Missing error handling, edge cases | Prompt didn't specify requirements |
| Integration Failure | Works alone, fails with other services | Missing system context in prompt |
| Performance Failure | Correct but slow/resource-heavy | No performance constraints in prompt |
| Security Failure | Works but vulnerable | No security requirements in prompt |

**Step 2: The "5 Whys" for AI Failures**

```
Failure: Payment service returns 500 errors for 1% of transactions

Why 1: The code doesn't handle network timeouts to Stripe
Why 2: The prompt didn't specify timeout handling
Why 3: Our prompt template doesn't include resilience patterns
Why 4: We don't have a standard policy for external API calls
Why 5: We haven't codified our reliability requirements

ROOT CAUSE: Missing "Policy as Code" for external integrations

FIX: Add to standard prompt template:
"All external API calls must:
- Set timeout of 5 seconds
- Implement retry with exponential backoff (3 attempts)
- Have circuit breaker after 5 consecutive failures
- Return graceful degradation response on failure"
```

**Step 3: Diagnostic Prompt for AI**
```
I'm debugging an AI-generated service that has the following issue:

SERVICE: {service_name}
ORIGINAL PROMPT: {original_prompt}
GENERATED CODE: {generated_code}
FAILURE SYMPTOM: {failure_description}
ERROR LOGS: {relevant_logs}

Analyze this failure and identify:
1. Is this a prompt issue, code issue, or integration issue?
2. What specific aspect of the prompt led to this failure?
3. How should the prompt be modified to prevent this?
4. What tests would catch this failure earlier?

Be specific and actionable.
```

**Step 4: Build a Failure Knowledge Base**

```python
# Track AI failures to improve prompts
class AIFailureKnowledgeBase:
    
    failures = [
        {
            "id": "F001",
            "category": "security",
            "symptom": "SQL injection vulnerability",
            "prompt_gap": "Didn't specify parameterized queries",
            "fix": "Add to security policy: 'Use parameterized queries only'",
            "test_added": "test_sql_injection_prevention()"
        },
        {
            "id": "F002", 
            "category": "reliability",
            "symptom": "Timeout calling external API",
            "prompt_gap": "No timeout specification",
            "fix": "Add to integration policy: 'Set 5s timeout on external calls'",
            "test_added": "test_external_api_timeout_handling()"
        },
        # Build this over time from production issues
    ]
    
    def get_relevant_policies(self, service_type: str) -> list[str]:
        """Return policies based on past failures for this service type"""
        return [f["fix"] for f in self.failures if f["service_type"] == service_type]
```

---

# PART 3: AI FAILURE MODES — KNOW THESE COLD

## The 15 Most Common AI Coding Failures

### Category 1: Security Failures

**1. Missing Input Validation**
```python
# AI generates:
@app.post("/users")
def create_user(data: dict):  # ❌ No validation
    db.insert(data)

# Should be:
@app.post("/users")
def create_user(data: UserCreate):  # ✅ Pydantic model validates
    db.insert(data.dict())
```

**2. SQL Injection Vulnerability**
```python
# AI generates:
query = f"SELECT * FROM users WHERE email = '{email}'"  # ❌ Injection risk

# Should be:
query = "SELECT * FROM users WHERE email = :email"
db.execute(query, {"email": email})  # ✅ Parameterized
```

**3. Hardcoded Secrets**
```python
# AI generates:
API_KEY = "sk_live_abc123"  # ❌ Hardcoded

# Should be:
API_KEY = os.environ["API_KEY"]  # ✅ Environment variable
```

**4. Missing Authentication**
```python
# AI generates:
@app.delete("/users/{user_id}")
def delete_user(user_id: int):  # ❌ No auth check
    db.delete(user_id)

# Should be:
@app.delete("/users/{user_id}")
def delete_user(user_id: int, current_user: User = Depends(get_current_user)):
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(403)  # ✅ Auth + authz
    db.delete(user_id)
```

**5. PII Logging**
```python
# AI generates:
logger.info(f"User registered: {user.email}, SSN: {user.ssn}")  # ❌ Logs PII

# Should be:
logger.info(f"User registered: user_id={user.id}")  # ✅ No PII
```

### Category 2: Reliability Failures

**6. Missing Error Handling**
```python
# AI generates:
def fetch_data():
    response = requests.get(url)  # ❌ No error handling
    return response.json()

# Should be:
def fetch_data():
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        return response.json()
    except requests.Timeout:
        logger.warning("Request timed out")
        return None
    except requests.HTTPError as e:
        logger.error(f"HTTP error: {e}")
        raise ServiceUnavailable()
```

**7. No Timeout on External Calls**
```python
# AI generates:
requests.get(external_api)  # ❌ Could hang forever

# Should be:
requests.get(external_api, timeout=5)  # ✅ Explicit timeout
```

**8. Resource Leaks**
```python
# AI generates:
def process_file(path):
    f = open(path)  # ❌ Never closed
    return f.read()

# Should be:
def process_file(path):
    with open(path) as f:  # ✅ Context manager
        return f.read()
```

**9. Missing Retry Logic**
```python
# AI generates:
def call_flaky_api():
    return requests.post(url, data=data)  # ❌ Fails on transient errors

# Should be:
@retry(stop=stop_after_attempt(3), wait=wait_exponential())
def call_flaky_api():
    return requests.post(url, data=data, timeout=5)  # ✅ Retries
```

### Category 3: Scalability Failures

**10. N+1 Query Problem**
```python
# AI generates:
def get_orders_with_items():
    orders = db.query(Order).all()
    for order in orders:
        items = db.query(Item).filter_by(order_id=order.id).all()  # ❌ N queries
        order.items = items

# Should be:
def get_orders_with_items():
    orders = db.query(Order).options(joinedload(Order.items)).all()  # ✅ 1 query
```

**11. Unbounded Queries**
```python
# AI generates:
def get_all_users():
    return db.query(User).all()  # ❌ Could return millions

# Should be:
def get_users(limit: int = 20, offset: int = 0):
    return db.query(User).limit(limit).offset(offset).all()  # ✅ Paginated
```

**12. Missing Connection Pooling**
```python
# AI generates:
def get_data():
    conn = psycopg2.connect(...)  # ❌ New connection per request
    return conn.execute(query)

# Should be:
pool = psycopg2.pool.SimpleConnectionPool(1, 20, ...)
def get_data():
    conn = pool.getconn()  # ✅ Pooled connection
    try:
        return conn.execute(query)
    finally:
        pool.putconn(conn)
```

### Category 4: Correctness Failures

**13. Race Conditions**
```python
# AI generates:
def transfer(from_acc, to_acc, amount):
    if from_acc.balance >= amount:  # ❌ TOCTOU race
        from_acc.balance -= amount
        to_acc.balance += amount

# Should be:
def transfer(from_acc, to_acc, amount):
    with db.begin():  # ✅ Transaction
        db.execute("SELECT ... FOR UPDATE")  # Lock rows
        if from_acc.balance >= amount:
            from_acc.balance -= amount
            to_acc.balance += amount
```

**14. Floating Point Money**
```python
# AI generates:
total = 0.1 + 0.2  # ❌ = 0.30000000000000004

# Should be:
from decimal import Decimal
total = Decimal("0.1") + Decimal("0.2")  # ✅ = 0.3
```

**15. Timezone Confusion**
```python
# AI generates:
created_at = datetime.now()  # ❌ Local time, ambiguous

# Should be:
created_at = datetime.now(timezone.utc)  # ✅ Explicit UTC
```

---

# PART 4: PROMPT ENGINEERING FOR PRODUCTION CODE

## The CRISP Framework for Production Prompts

**C** — Context (System and constraints)
**R** — Requirements (What it must do)
**I** — Interface (Inputs, outputs, contracts)
**S** — Security (Auth, validation, PII handling)
**P** — Performance (Latency, scale, resources)

### Example: Applying CRISP

**Bad Prompt:**
```
Create an API endpoint to upload profile pictures
```

**CRISP Prompt:**
```
CONTEXT:
- FastAPI application
- PostgreSQL database with Users table
- S3 for file storage
- Running behind nginx with 10MB body limit

REQUIREMENTS:
- Endpoint: POST /api/v1/users/{user_id}/avatar
- Accept image upload (JPEG, PNG only)
- Resize to 200x200 thumbnail
- Store original in S3, thumbnail in S3
- Update user.avatar_url in database
- Return new avatar URLs

INTERFACE:
- Input: multipart/form-data with 'file' field
- Output: {"avatar_url": "...", "thumbnail_url": "..."}
- Errors: 400 for invalid file, 413 for too large, 404 for user not found

SECURITY:
- Require valid JWT token
- User can only update their own avatar (or admin)
- Validate file is actually an image (check magic bytes, not just extension)
- Max file size: 5MB
- Sanitize filename before S3 upload
- Generate random S3 key (don't use original filename)

PERFORMANCE:
- Resize asynchronously (return immediately, process in background)
- Target latency: <200ms for upload acceptance
- Use presigned S3 URLs for direct browser upload if >1MB
```

## Prompt Templates by Service Type

### Template: REST API Endpoint
```
Create a {HTTP_METHOD} endpoint at {PATH}

CONTEXT:
- Framework: {FRAMEWORK}
- Database: {DATABASE}
- Authentication: {AUTH_METHOD}

FUNCTIONALITY:
{DETAILED_REQUIREMENTS}

INPUT:
- Request body: {SCHEMA_OR_DESCRIPTION}
- Path params: {PATH_PARAMS}
- Query params: {QUERY_PARAMS}

OUTPUT:
- Success (200): {SUCCESS_SCHEMA}
- Errors: {ERROR_CASES_AND_CODES}

SECURITY:
- Authentication required: {YES/NO}
- Authorization rules: {RULES}
- Input validation: {VALIDATION_RULES}
- Rate limiting: {LIMITS}

PERFORMANCE:
- Expected latency: {TARGET}
- Expected throughput: {RPS}
- Caching strategy: {CACHE_RULES}

ERROR HANDLING:
- {SPECIFIC_ERROR_SCENARIOS_AND_RESPONSES}

Include:
- Comprehensive logging (no PII)
- Request validation with Pydantic
- Proper HTTP status codes
- Docstring with example request/response
```

### Template: Background Worker
```
Create a background worker that {DESCRIPTION}

TRIGGER:
- {QUEUE_NAME} messages / {CRON_SCHEDULE} / {EVENT_TYPE}

PROCESSING:
{STEP_BY_STEP_LOGIC}

RELIABILITY:
- Retry policy: {ATTEMPTS} attempts with {BACKOFF} backoff
- Dead letter queue: {DLQ_NAME}
- Idempotency: {HOW_TO_ENSURE}
- Timeout: {MAX_PROCESSING_TIME}

RESOURCES:
- Max concurrent: {CONCURRENCY}
- Memory limit: {MEMORY}
- External dependencies: {SERVICES}

MONITORING:
- Success metric: {METRIC}
- Failure alerting: {THRESHOLD}
- Processing time histogram

ERROR HANDLING:
- Transient errors: {RETRY_STRATEGY}
- Permanent errors: {DLQ_STRATEGY}
- Partial failures: {ROLLBACK_OR_CONTINUE}
```

### Template: Database Migration
```
Create a database migration for {DESCRIPTION}

CURRENT STATE:
{CURRENT_SCHEMA}

TARGET STATE:
{DESIRED_SCHEMA}

CONSTRAINTS:
- Zero downtime required: {YES/NO}
- Data preservation: {RULES}
- Rollback strategy: {STRATEGY}

SAFETY:
- If table has >1M rows: use batched updates
- Add indexes CONCURRENTLY
- Include down migration
- Validate data integrity after migration

GENERATE:
1. Up migration
2. Down migration
3. Data validation query
4. Rollback instructions
```

---

# PART 5: REVIEWING AI OUTPUT — THE NEW CODE REVIEW

## The AI Output Review Checklist

### Security Review (CRITICAL)
```
□ Authentication enforced on protected endpoints?
□ Authorization checks present (not just authn)?
□ Input validation using schemas (not manual checks)?
□ SQL queries parameterized (no string concatenation)?
□ No hardcoded secrets or API keys?
□ PII not logged or exposed in errors?
□ File uploads validated (type, size, content)?
□ CORS configured restrictively?
□ Rate limiting implemented?
□ Sensitive data encrypted at rest/transit?
```

### Reliability Review (HIGH)
```
□ All external calls have timeouts?
□ Retry logic for transient failures?
□ Circuit breakers for failing dependencies?
□ Graceful degradation when services unavailable?
□ Resources properly closed (connections, files)?
□ Transactions used for multi-step operations?
□ Errors logged with context for debugging?
□ Health check endpoints present?
```

### Scalability Review (MEDIUM)
```
□ Database queries optimized (no N+1)?
□ Pagination on list endpoints?
□ Connection pooling configured?
□ Expensive operations done async?
□ Caching strategy appropriate?
□ No unbounded memory growth?
□ Stateless (can scale horizontally)?
```

### Correctness Review (HIGH)
```
□ Business logic matches requirements?
□ Edge cases handled (empty, null, max values)?
□ Concurrent access handled correctly?
□ Timezone handling explicit?
□ Money uses Decimal, not float?
□ Off-by-one errors checked?
```

### Maintainability Review (MEDIUM)
```
□ Code is readable and well-structured?
□ Functions have single responsibility?
□ Magic numbers replaced with constants?
□ Error messages are helpful?
□ Logging is appropriate (not too verbose)?
□ Configuration externalized?
```

## Sample Review: Profile Picture Upload

**Prompt Given:**
```
"Create a fast API endpoint to upload a user's profile picture"
```

**AI Generated Code:**
```python
@app.post("/upload-picture")
async def upload_picture(file: UploadFile):
    contents = await file.read()
    with open(f"uploads/{file.filename}", "wb") as f:
        f.write(contents)
    return {"filename": file.filename}
```

**Your Review:**

```markdown
## Security Issues (CRITICAL)

1. **No Authentication** — Anyone can upload files
   - Fix: Add `current_user: User = Depends(get_current_user)`

2. **Path Traversal Vulnerability** — filename could be "../../../etc/passwd"
   - Fix: Sanitize filename or generate UUID

3. **No File Type Validation** — Could upload executable/malware
   - Fix: Check magic bytes, not just extension

4. **No Size Limit** — DoS via large file upload
   - Fix: Add size check before reading entire file

5. **Original Filename Used** — Could overwrite other users' files
   - Fix: Generate unique filename

## Reliability Issues (HIGH)

6. **No Error Handling** — Disk full? Permission denied?
   - Fix: Try/except with specific error responses

7. **Sync File Write in Async Function** — Blocks event loop
   - Fix: Use aiofiles or run_in_executor

## Scalability Issues (MEDIUM)

8. **Local File Storage** — Won't work with multiple servers
   - Fix: Use S3 or similar object storage

9. **File Read Into Memory** — Large files will OOM
   - Fix: Stream to storage in chunks

## Correctness Issues (MEDIUM)

10. **No User Association** — Whose picture is this?
    - Fix: Associate with user_id, update user record

## Improved Version:

```python
import uuid
import aiofiles
from fastapi import UploadFile, HTTPException, Depends
from app.auth import get_current_user
from app.storage import s3_client

ALLOWED_TYPES = {"image/jpeg", "image/png"}
MAX_SIZE = 5 * 1024 * 1024  # 5MB

@app.post("/api/v1/users/me/avatar")
async def upload_avatar(
    file: UploadFile,
    current_user: User = Depends(get_current_user)
):
    # Validate content type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Only JPEG and PNG allowed")
    
    # Validate size (read in chunks)
    size = 0
    chunks = []
    async for chunk in file:
        size += len(chunk)
        if size > MAX_SIZE:
            raise HTTPException(413, "File too large (max 5MB)")
        chunks.append(chunk)
    
    content = b"".join(chunks)
    
    # Validate magic bytes
    if not is_valid_image(content):
        raise HTTPException(400, "Invalid image file")
    
    # Generate safe filename
    ext = file.filename.split(".")[-1].lower()
    key = f"avatars/{current_user.id}/{uuid.uuid4()}.{ext}"
    
    # Upload to S3
    try:
        await s3_client.upload(key, content, file.content_type)
    except Exception as e:
        logger.error(f"S3 upload failed: {e}", extra={"user_id": current_user.id})
        raise HTTPException(502, "Storage service unavailable")
    
    # Update user record
    avatar_url = f"https://cdn.example.com/{key}"
    await update_user_avatar(current_user.id, avatar_url)
    
    return {"avatar_url": avatar_url}
```
```

---

# PART 6: THE 30-MINUTE APP BUILD

## Strategy for Live Building

### Phase 1: First 5 Minutes — Plan
```
1. Clarify requirements (2 min)
   - "What's the core user flow?"
   - "Any specific tech stack required?"
   - "What's the MVP vs nice-to-have?"

2. Sketch architecture (2 min)
   - Frontend: React/Next.js or simple HTML
   - Backend: FastAPI/Express
   - Database: SQLite for speed or Postgres
   - Draw 3-box diagram: UI → API → DB

3. Define modules (1 min)
   - List 3-5 components to build
   - Prioritize: what's the critical path?
```

### Phase 2: Minutes 5-25 — Build
```
4. Generate scaffolding (3 min)
   - "Create a FastAPI project with SQLite, User model, CORS enabled"
   
5. Build core API (8 min)
   - Prompt for each endpoint with CRISP format
   - Copy, review quickly, fix obvious issues
   
6. Build UI (8 min)
   - "Create a React component for [core feature]"
   - Focus on functionality over styling
   
7. Connect frontend to backend (3 min)
   - API calls, error handling
   
8. Handle auth if needed (3 min)
   - Simple JWT or skip if not required
```

### Phase 3: Last 5 Minutes — Polish
```
9. Test critical path (2 min)
   - Does the main flow work end-to-end?
   
10. Add error handling (2 min)
    - At least show errors don't crash the app
    
11. Explain what's missing (1 min)
    - "In production, I'd add X, Y, Z"
```

## Practice Apps (Build These Before the Interview)

### App 1: Todo List with Auth
```
- User registration/login
- CRUD todos
- Mark complete
- Filter by status

Time target: 25 minutes

Key challenges:
- JWT authentication flow
- Protected routes
- Database relationships
```

### App 2: Sentiment Analysis Service
```
- Text input endpoint
- Call sentiment API (or mock it)
- Store results
- Show history

Time target: 25 minutes

Key challenges:
- External API integration
- Async processing
- Result caching
```

### App 3: Trip Itinerary App
```
- Add destinations
- Set dates and notes
- Reorder stops
- Share itinerary

Time target: 30 minutes

Key challenges:
- Drag-and-drop ordering
- Date handling
- Shareable links
```

### App 4: Real-time Chat
```
- Join chat rooms
- Send messages
- See online users
- Message history

Time target: 30 minutes

Key challenges:
- WebSocket handling
- Real-time updates
- Message persistence
```

## Tools to Practice With

| Tool | Best For | Speed |
|------|----------|-------|
| Cursor | Full IDE experience | ⭐⭐⭐ |
| Claude Artifacts | Quick UI prototypes | ⭐⭐⭐⭐ |
| Replit Agent | End-to-end apps | ⭐⭐⭐⭐ |
| v0.dev | React components | ⭐⭐⭐⭐⭐ |
| GitHub Copilot | Code completion | ⭐⭐⭐ |
| Bolt.new | Full-stack apps | ⭐⭐⭐⭐ |

**Practice with at least 2 tools** — the interviewer may specify one.

---

# PART 7: ARCHITECTURAL MIGRATION QUESTIONS

## Sample Question:
> "Imagine moving a legacy internal tool to an AI-first architecture. 
> How would you structure the 'Source of Truth' for requirements so that 
> AI agents can generate a multi-service backend without architectural drift?"

## Framework for Answering

### Step 1: Define the Source of Truth Structure

```
ARCHITECTURE REPOSITORY STRUCTURE:

/architecture
  /contracts
    - api-specs/           # OpenAPI specs for all services
    - event-schemas/       # Async event formats
    - data-models/         # Shared domain models
  
  /policies
    - security.md          # Security requirements
    - reliability.md       # SLAs, retry policies
    - observability.md     # Logging, metrics, tracing
    - data-handling.md     # PII, encryption, retention
  
  /patterns
    - api-endpoint.md      # Template for REST endpoints
    - background-worker.md # Template for async workers
    - database-migration.md # Template for migrations
  
  /decisions
    - ADR-001-auth.md      # Why we chose JWT
    - ADR-002-database.md  # Why we chose Postgres
    - ADR-003-messaging.md # Why we chose Kafka
  
  /services
    /user-service
      - CONTEXT.md         # Service-specific context
      - interfaces.yaml    # This service's contracts
    /order-service
      - CONTEXT.md
      - interfaces.yaml
```

### Step 2: How AI Agents Consume This

```python
class ArchitectureAwareAgent:
    
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.load_context()
    
    def load_context(self):
        # Load global policies
        self.security_policy = read_file("architecture/policies/security.md")
        self.reliability_policy = read_file("architecture/policies/reliability.md")
        
        # Load relevant contracts
        self.api_contracts = read_file(f"architecture/services/{self.service_name}/interfaces.yaml")
        
        # Load patterns
        self.patterns = read_dir("architecture/patterns/")
        
        # Load service-specific context
        self.service_context = read_file(f"architecture/services/{self.service_name}/CONTEXT.md")
    
    def generate_endpoint(self, requirement: str) -> str:
        prompt = f"""
        GLOBAL POLICIES:
        {self.security_policy}
        {self.reliability_policy}
        
        SERVICE CONTEXT:
        {self.service_context}
        
        API CONTRACTS TO FOLLOW:
        {self.api_contracts}
        
        PATTERN TO USE:
        {self.patterns['api-endpoint']}
        
        REQUIREMENT:
        {requirement}
        
        Generate code that follows all policies and contracts.
        """
        return llm.generate(prompt)
```

### Step 3: Preventing Architectural Drift

```python
class ArchitectureGuard:
    """CI/CD step that validates AI-generated code against architecture"""
    
    def validate(self, generated_code: str, service_name: str):
        errors = []
        
        # Check API contract compliance
        if not self.matches_openapi_spec(generated_code, service_name):
            errors.append("API doesn't match contract")
        
        # Check security policy compliance
        security_issues = self.check_security_policy(generated_code)
        errors.extend(security_issues)
        
        # Check architectural patterns
        pattern_violations = self.check_patterns(generated_code)
        errors.extend(pattern_violations)
        
        # Check cross-service consistency
        consistency_issues = self.check_cross_service(generated_code, service_name)
        errors.extend(consistency_issues)
        
        if errors:
            raise ArchitectureDriftError(errors)
```

### Step 4: The Migration Process

```
PHASE 1: Document (Week 1-2)
- Extract implicit architecture from legacy code
- Document as explicit policies and contracts
- Create ADRs for key decisions

PHASE 2: Validate (Week 3)
- Build ArchitectureGuard validators
- Test against legacy code (should pass)
- Add to CI/CD pipeline

PHASE 3: Migrate (Week 4+)
- Migrate one service at a time
- Use AI with architecture context
- Validate each migration against contracts

PHASE 4: Iterate (Ongoing)
- Update policies based on issues found
- Improve prompt templates
- Build failure knowledge base
```

---

# PART 8: MOCK INTERVIEW SCENARIOS WITH MODEL ANSWERS

## Scenario 1: The Silent Failure

**Interviewer:** "An AI-generated data pipeline produces subtly incorrect results for 1% of queries, yet all automated tests pass. How do you diagnose and fix this?"

**Your Answer:**

```
"This is a classic 'vibe failure' — the AI generated something that's syntactically 
correct and passes unit tests but is semantically wrong for edge cases.

STEP 1: CHARACTERIZE THE FAILURE
First, I'd identify what the 1% have in common:
- Are they specific input types? (Unicode, special characters, nulls)
- Specific data ranges? (Boundary values, negative numbers)
- Specific time periods? (Timezone issues, DST transitions)
- Specific source systems? (One upstream has different format)

I'd query production logs to find all failing cases and look for patterns.

STEP 2: TRACE TO THE PROMPT
Once I know the pattern, I'd examine the original prompt:
- Did we specify how to handle this case?
- Did we provide examples of edge cases?
- Did we include validation requirements?

Often, 1% failures come from implicit assumptions. The prompt said 
'parse dates' but didn't specify timezone handling, so the AI assumed 
local time while the data is UTC.

STEP 3: ROOT CAUSE ANALYSIS
I'd do a '5 Whys':
- Why did it fail? Timezone conversion wrong
- Why? Code assumed local time
- Why? Prompt didn't specify timezone
- Why? Our prompt template doesn't include timezone policy
- Why? We haven't codified temporal data handling

ROOT CAUSE: Missing 'Policy as Code' for temporal data

STEP 4: IMMEDIATE FIX
- Fix the specific code issue
- Add tests for the failure case
- Deploy with monitoring

STEP 5: SYSTEMIC FIX
- Add to our policies: 'All timestamps must be UTC. Parse with explicit 
  timezone. Store as ISO 8601 with Z suffix.'
- Add property-based tests: Use Hypothesis to test with random timezones
- Add LLM-as-judge evaluation: 'Does this code handle timezones correctly?'

STEP 6: PREVENT RECURRENCE
- Add the failure to our knowledge base
- Update prompt templates to include temporal handling
- Add pre-merge check: 'Any datetime code triggers timezone review'

The key insight is: the test suite passed because we tested what we 
thought of, not what we didn't think of. The fix is to expand our 
validation to catch semantic errors, not just syntactic ones."
```

---

## Scenario 2: Prompt + Code Review

**Interviewer:** "Review this prompt and generated code. What are your concerns?"

**Prompt:**
```
"Create a Stripe integration to process user payments"
```

**Generated Code:**
```python
import stripe

@app.post("/pay")
def pay(amount: int, token: str):
    stripe.api_key = "sk_live_abc123"
    charge = stripe.Charge.create(
        amount=amount,
        currency="usd",
        source=token
    )
    return {"status": "success", "charge_id": charge.id}
```

**Your Answer:**

```
"I see several critical issues with both the prompt and the generated code.

PROMPT ISSUES:

1. Too vague — 'process payments' doesn't specify:
   - What payment flow? (One-time, subscription, marketplace?)
   - What amount validation?
   - What error scenarios to handle?
   - What to record/store?

SECURITY ISSUES (CRITICAL):

1. Hardcoded API key — 'sk_live_abc123' should be environment variable
   - Risk: Key in version control, exposed in logs
   
2. No authentication — Anyone can call /pay
   - Risk: Unauthorized charges

3. No amount validation — Could charge negative or absurd amounts
   - Risk: Financial fraud

4. Using deprecated Charges API — Should use PaymentIntents
   - Risk: Missing 3D Secure, SCA non-compliance

RELIABILITY ISSUES:

5. No error handling — Stripe errors crash the endpoint
   - Risk: Poor user experience, no retry logic

6. No idempotency key — Retries could double-charge
   - Risk: Financial loss for users

7. No logging — Can't debug issues
   - Risk: Undetectable fraud or failures

CORRECTNESS ISSUES:

8. No database record — Payment not linked to user/order
   - Risk: Can't reconcile, can't refund

9. Returns immediately — Should verify charge succeeded
   - Risk: Could return success on pending

IMPROVED PROMPT:
'Create a Stripe PaymentIntent integration for one-time purchases.
- Require authenticated user
- Validate amount: $1-$10,000 USD
- Use idempotency keys for retry safety
- Store payment record in database
- Handle: card_declined, insufficient_funds, expired_card
- Log events (no card details)
- Use environment variables for API keys
- Follow PCI DSS guidelines'

IMPROVED CODE:
```python
import stripe
from fastapi import HTTPException, Depends
import uuid

stripe.api_key = os.environ['STRIPE_SECRET_KEY']

@app.post("/api/v1/payments")
async def create_payment(
    amount: int,
    current_user: User = Depends(get_current_user)
):
    # Validate amount
    if not 100 <= amount <= 1000000:  # $1 - $10,000 in cents
        raise HTTPException(400, "Amount must be $1-$10,000")
    
    # Generate idempotency key
    idempotency_key = f"{current_user.id}-{uuid.uuid4()}"
    
    try:
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency="usd",
            customer=current_user.stripe_customer_id,
            idempotency_key=idempotency_key,
            metadata={"user_id": str(current_user.id)}
        )
        
        # Record in database
        await save_payment_record(
            user_id=current_user.id,
            amount=amount,
            stripe_intent_id=intent.id,
            status="pending"
        )
        
        logger.info("Payment initiated", extra={
            "user_id": current_user.id,
            "amount": amount,
            "intent_id": intent.id
        })
        
        return {"client_secret": intent.client_secret}
        
    except stripe.error.CardError as e:
        logger.warning("Card declined", extra={"user_id": current_user.id})
        raise HTTPException(400, "Card was declined")
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}", extra={"user_id": current_user.id})
        raise HTTPException(502, "Payment service unavailable")
```

The key takeaway: the prompt was too vague, which let the AI generate 
insecure, unreliable code. A better prompt would have prevented most 
of these issues."
```

---

## Scenario 3: Mentoring Question

**Interviewer:** "How would you mentor a junior engineer who can rapidly generate functional UI components with AI but struggles to explain performance characteristics?"

**Your Answer:**

```
"This is a common pattern with AI-native engineers. They have strong 
'vibe' skills but weak fundamentals. Here's my mentorship approach:

DIAGNOSIS FIRST:
I'd start by understanding what they actually know:
- Can they explain what happens when a user clicks a button?
- Do they understand the network request lifecycle?
- Can they read a flame chart or network waterfall?

Often they can BUILD but can't EXPLAIN because AI abstracted away 
the understanding.

MY MENTORSHIP STRATEGY:

1. THE 'WHY TOUR' TECHNIQUE
For each component they generate, I'd ask:
- 'Why did the AI put this useEffect here? What would break without it?'
- 'This component re-renders 15 times. Why? Is that a problem?'
- 'The AI used useMemo. What would happen if we removed it?'

They learn by investigating the AI's decisions, not just accepting them.

2. THE 'BUILD IT WORSE' EXERCISE
I'd ask them to intentionally create performance problems:
- 'Make this list take 5 seconds to render. Now make it instant.'
- 'Make this form cause 100 re-renders. Now make it cause 2.'

Understanding how to break something teaches you how it works.

3. PROGRESSIVE PROMPTING
Instead of 'Create a search component', I'd have them prompt in layers:
- 'Create the input field' — Explain what the AI generated
- 'Add debouncing' — Why debouncing? What problem does it solve?
- 'Add virtualization for 10k results' — What's the perf impact?

Each layer requires explaining the CONCEPT, not just accepting the code.

4. SYSTEM-LEVEL THINKING
I'd assign them to trace a user action end-to-end:
- Draw the data flow from click to database and back
- Identify every network hop, every state change
- Measure latency at each step

This builds the mental model that AI can't give them.

5. CODE REVIEW ROTATION
I'd have them review AI-generated code from others:
- 'What performance issues do you see?'
- 'What would happen at 10x scale?'
- 'What's the Big O of this operation?'

Teaching others solidifies understanding.

SUCCESS METRICS:
After 3 months, they should be able to:
- Explain why React re-renders and how to prevent it
- Read a performance profile and identify bottlenecks
- Predict the network waterfall for a given interaction
- Write prompts that INCLUDE performance requirements

The goal isn't to stop them using AI — it's to make them a better 
pilot of the AI by understanding what's under the hood."
```

---

# PART 9: QUICK REFERENCE CARDS

## Card 1: The CRISP Prompt Framework
```
C - CONTEXT: System, tech stack, constraints
R - REQUIREMENTS: What it must do, acceptance criteria
I - INTERFACE: Inputs, outputs, schemas
S - SECURITY: Auth, validation, PII handling
P - PERFORMANCE: Latency, scale, resources
```

## Card 2: AI Failure Types
```
HALLUCINATION — Invents APIs/methods that don't exist
MISINTERPRETATION — Does wrong thing correctly
PARTIAL — Missing error handling, edge cases
INSECURE — Auth, injection, PII exposure
UNRELIABLE — No timeouts, retries, fallbacks
UNSCALABLE — N+1, no pagination, connection leaks
INCORRECT — Race conditions, float money, timezone bugs
```

## Card 3: Review Checklist
```
SECURITY: Auth? Authz? Input validation? No secrets? No PII logging?
RELIABILITY: Timeouts? Retries? Error handling? Resource cleanup?
SCALABILITY: Pagination? Pooling? No N+1? Async for slow ops?
CORRECTNESS: Edge cases? Concurrency? Decimal money? UTC time?
```

## Card 4: Diagnostic Framework
```
1. CHARACTERIZE — What's the pattern in failures?
2. TRACE — What prompt created this code?
3. ROOT CAUSE — What's the systemic gap?
4. IMMEDIATE FIX — Fix the code + add test
5. SYSTEMIC FIX — Update policies and templates
6. PREVENT — Add to knowledge base + CI checks
```

## Card 5: 30-Minute Build
```
0-5 min: PLAN — Clarify, sketch, prioritize
5-13 min: BACKEND — Scaffolding, core API
13-21 min: FRONTEND — Components, core UI
21-26 min: CONNECT — API calls, state
26-30 min: POLISH — Test, error handling, explain gaps
```

---

# PART 10: YOUR PREPARATION CHECKLIST

## Week Before Interview

### Day 1-2: Build Apps
- [ ] Build todo app with auth (25 min target)
- [ ] Build sentiment analysis service (25 min target)
- [ ] Build trip itinerary app (30 min target)
- [ ] Document where AI failed and how you fixed it

### Day 3-4: Learn Failure Modes
- [ ] Review all 15 failure modes in this guide
- [ ] Intentionally trigger 5 of them and fix them
- [ ] Create your own failure knowledge base

### Day 5: Practice Reviews
- [ ] Review 3 AI-generated code samples for issues
- [ ] Practice improving vague prompts with CRISP
- [ ] Time yourself: can you do a thorough review in 5 minutes?

### Day 6: Mock Scenarios
- [ ] Practice silent failure diagnosis out loud
- [ ] Practice mentoring question answer
- [ ] Practice architectural migration answer
- [ ] Use Gemini prompt from doc for mock interview

### Day 7: Light Review
- [ ] Re-read quick reference cards
- [ ] Do one 30-minute app build
- [ ] Rest and prepare mentally

---

# FINAL THOUGHTS

## What They're Really Assessing

1. **Can you ship with AI tools?** — The 30-minute build proves this
2. **Can you catch AI's mistakes?** — The review exercise proves this
3. **Can you diagnose AI failures?** — The silent failure question proves this
4. **Can you lead AI-native teams?** — The mentoring question proves this
5. **Can you think architecturally?** — The migration question proves this

## Your Advantage

From your resume, you already have:
- Production ML systems (NHS, Rakuten, Datacove)
- Twacha Labs — literally building with GPT-4o Vision
- Human-in-the-loop validation experience
- System design for reliability

**This interview is about demonstrating what you already do.**

## The Mindset

Don't treat AI as magic. Treat it as a very fast junior engineer:
- It codes quickly but makes mistakes
- It needs clear requirements
- It doesn't know your system's constraints
- Its output must be reviewed

Your job is to be the senior engineer who makes AI productive and safe.

You've got this.
