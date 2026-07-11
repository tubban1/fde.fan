# GOOGLE INTERVIEW PROBLEM SET
# GOOGLE 面试题库

## Forward Deployed Engineer - Applied AI
## 25-Day Study Plan:
## 25天学习计划：

---

# WEEK 1: FOUNDATIONS
# 第 1 周：基础篇
## Goal: Master fundamentals, build confidence with easy/medium problems
## 目标：掌握基础知识，通过简单/中等难度题目建立自信

### Day 1-2: Arrays & Hashing
### 第 1-2 天：数组与哈希表
**Concepts to nail (需要掌握的核心概念):**
- Time/space complexity analysis (时间/空间复杂度分析)
- Hash map for O(1) lookups (使用哈希表实现 O(1) 查找)
- Counting patterns (计数模式)

| # | Problem (题目) | Difficulty (难度) | Pattern (模式/技巧) | LeetCode # |
|---|---------|------------|---------|------------|
| 1 | Two Sum (两数之和) | Easy (简单) | Hash Map (哈希表) | 1 |
| 2 | Contains Duplicate (存在重复元素) | Easy (简单) | Hash Set (哈希集合) | 217 |
| 3 | Valid Anagram (有效的字母异位词) | Easy (简单) | Hash Map/Sorting (哈希表/排序) | 242 |
| 4 | Group Anagrams (字母异位词分组) | Medium (中等) | Hash Map (哈希表) | 49 |
| 5 | Top K Frequent Elements (前 K 个高频元素) | Medium (中等) | Hash Map + Heap (哈希表 + 堆) | 347 |
| 6 | Product of Array Except Self (除自身以外数组的乘积) | Medium (中等) | Prefix/Suffix (前缀/后缀积) | 238 |

### Day 3-4: Two Pointers
### 第 3-4 天：双指针
**Concepts to nail (需要掌握的核心概念):**
- Sorted array manipulation (有序数组操作)
- Opposite-end pointers (首尾双指针)
- Same-direction pointers (同向双指针)

| # | Problem (题目) | Difficulty (难度) | Pattern (模式/技巧) | LeetCode # |
|---|---------|------------|---------|------------|
| 1 | Valid Palindrome (验证回文串) | Easy (简单) | Two Pointers (双指针) | 125 |
| 2 | Two Sum II (sorted) (两数之和 II) | Medium (中等) | Two Pointers (双指针) | 167 |
| 3 | 3Sum (三数之和) | Medium (中等) | Two Pointers (双指针) | 15 |
| 4 | Container With Most Water (盛最多水的容器) | Medium (中等) | Two Pointers (双指针) | 11 |
| 5 | Trapping Rain Water (接雨水) | Hard (困难) | Two Pointers/DP (双指针/动态规划) | 42 |
| 6 | Remove Duplicates from Sorted Array (删除有序数组中的重复项) | Easy (简单) | Two Pointers (双指针) | 26 |

### Day 5-6: Sliding Window
### 第 5-6 天：滑动窗口
**Concepts to nail (需要掌握的核心概念):**
- Fixed vs variable window (固定窗口 vs 可变窗口)
- When to expand vs shrink (何时扩大 vs 何时缩小窗口)
- Hash map for character counts (用于字符计数的哈希表)

| # | Problem (题目) | Difficulty (难度) | Pattern (模式/技巧) | LeetCode # |
|---|---------|------------|---------|------------|
| 1 | Best Time to Buy and Sell Stock (买卖股票的最佳时机) | Easy (简单) | Sliding Window (滑动窗口) | 121 |
| 2 | Maximum Subarray (最大子数组和) | Medium (中等) | Kadane's (Kadane算法) | 53 |
| 3 | Longest Substring Without Repeating Characters (无重复字符的最长子串) | Medium (中等) | Sliding Window (滑动窗口) | 3 |
| 4 | Longest Repeating Character Replacement (替换后的最长重复字符) | Medium (中等) | Sliding Window (滑动窗口) | 424 |
| 5 | Minimum Window Substring (最小覆盖子串) | Hard (困难) | Sliding Window (滑动窗口) | 76 |
| 6 | Sliding Window Maximum (滑动窗口最大值) | Hard (困难) | Deque (双端队列) | 239 |

### Day 7: Stack & Queue
### 第 7 天：栈与队列
**Concepts to nail (需要掌握的核心概念):**
- LIFO vs FIFO (后进先出 vs 先进先出)
- Monotonic stack pattern (单调栈模式)
- Stack for matching brackets (括号匹配栈)

| # | Problem (题目) | Difficulty (难度) | Pattern (模式/技巧) | LeetCode # |
|---|---------|------------|---------|------------|
| 1 | Valid Parentheses (有效的括号) | Easy (简单) | Stack (栈) | 20 |
| 2 | Min Stack (最小栈) | Medium (中等) | Stack (栈) | 155 |
| 3 | Evaluate Reverse Polish Notation (逆波兰表达式求值) | Medium (中等) | Stack (栈) | 150 |
| 4 | Daily Temperatures (每日温度) | Medium (中等) | Monotonic Stack (单调栈) | 739 |
| 5 | Largest Rectangle in Histogram (柱状图中最大的矩形) | Hard (困难) | Monotonic Stack (单调栈) | 84 |

---

# WEEK 2: CORE PATTERNS
# 第 2 周：核心模式
## Goal: Master essential data structures and algorithms
## 目标：掌握基础数据结构和核心算法

### Day 8-9: Binary Search
### 第 8-9 天：二分查找
**Concepts to nail (需要掌握的核心概念):**
- Standard binary search template (标准二分查找模板)
- Search for boundaries (leftmost/rightmost) (查找边界 - 最左/最右)
- Search in modified arrays (在变形数组中查找)

| # | Problem (题目) | Difficulty (难度) | Pattern (模式/技巧) | LeetCode # |
|---|---------|------------|---------|------------|
| 1 | Binary Search (二分查找) | Easy (简单) | Standard (标准) | 704 |
| 2 | Search Insert Position (搜索插入位置) | Easy (简单) | Boundary (边界) | 35 |
| 3 | Find First and Last Position (在排序数组中查找元素范围) | Medium (中等) | Boundaries (边界) | 34 |
| 4 | Search in Rotated Sorted Array (搜索旋转排序数组) | Medium (中等) | Modified BS (变形二分查找) | 33 |
| 5 | Find Minimum in Rotated Sorted Array (寻找旋转排序数组中的最小值) | Medium (中等) | Modified BS (变形二分查找) | 153 |
| 6 | Search a 2D Matrix (搜索二维矩阵) | Medium (中等) | 2D BS (二维二分查找) | 74 |
| 7 | Koko Eating Bananas (爱吃香蕉的珂珂) | Medium (中等) | BS on Answer (在答案上二分) | 875 |

### Day 10-11: Linked Lists
### 第 10-11 天：链表
**Concepts to nail (需要掌握的核心概念):**
- Reversal techniques (反转技巧)
- Fast/slow pointers (快慢指针)
- Merge operations (合并操作)

| # | Problem (题目) | Difficulty (难度) | Pattern (模式/技巧) | LeetCode # |
|---|---------|------------|---------|------------|
| 1 | Reverse Linked List (反转链表) | Easy (简单) | Reversal (反转) | 206 |
| 2 | Merge Two Sorted Lists (合并两个有序链表) | Easy (简单) | Merge (合并) | 21 |
| 3 | Linked List Cycle (环形链表) | Easy (简单) | Fast/Slow (快慢指针) | 141 |
| 4 | Linked List Cycle II (环形链表 II) | Medium (中等) | Fast/Slow (快慢指针) | 142 |
| 5 | Remove Nth Node From End (删除链表的倒数第 N 个结点) | Medium (中等) | Two Pointers (双指针) | 19 |
| 6 | Reorder List (重排链表) | Medium (中等) | Multiple (混合技巧) | 143 |
| 7 | Merge K Sorted Lists (合并 K 个升序链表) | Hard (困难) | Heap + Merge (堆+合并) | 23 |

### Day 12-13: Trees
### 第 12-13 天：树
**Concepts to nail (需要掌握的核心概念):**
- DFS traversals (pre/in/post) (DFS遍历：前/中/后序)
- BFS level-order (BFS 层序遍历)
- BST properties (BST 性质)

| # | Problem (题目) | Difficulty (难度) | Pattern (模式/技巧) | LeetCode # |
|---|---------|------------|---------|------------|
| 1 | Maximum Depth of Binary Tree (二叉树的最大深度) | Easy (简单) | DFS | 104 |
| 2 | Invert Binary Tree (翻转二叉树) | Easy (简单) | DFS | 226 |
| 3 | Same Tree (相同的树) | Easy (简单) | DFS | 100 |
| 4 | Binary Tree Level Order Traversal (二叉树的层序遍历) | Medium (中等) | BFS | 102 |
| 5 | Validate Binary Search Tree (验证二叉搜索树) | Medium (中等) | DFS | 98 |
| 6 | Lowest Common Ancestor (二叉树的最近公共祖先) | Medium (中等) | DFS | 236 |
| 7 | Binary Tree Right Side View (二叉树的右视图) | Medium (中等) | BFS | 199 |
| 8 | Kth Smallest Element in BST (二叉搜索树中第 K 小的元素) | Medium (中等) | Inorder (中序遍历) | 230 |
| 9 | Construct Binary Tree from Preorder and Inorder (从前序与中序遍历序列构造二叉树) | Medium (中等) | Recursion (递归) | 105 |
| 10 | Serialize and Deserialize Binary Tree (二叉树的序列化与反序列化) | Hard (困难) | BFS/DFS | 297 |

### Day 14: Sorting Review
### 第 14 天：排序复习
**Concepts to nail (需要掌握的核心概念):**
- Implement merge sort from scratch (从头实现归并排序)
- Implement quicksort from scratch (从头实现快速排序)
- Know when to use which (知道何时使用哪种排序)

**Practice (练习):**
1. Implement merge sort - explain each step (实现归并排序 - 解释每一步)
2. Implement quicksort - explain partition (实现快速排序 - 解释分区操作)
3. Sort Colors (颜色分类/荷兰国旗) - LeetCode 75
4. Merge Intervals (合并区间) - LeetCode 56

---

# WEEK 3: ADVANCED PATTERNS + MOCKS
# 第 3 周：高级进阶模式 + 模拟面试
## Goal: Handle harder problems, practice under time pressure
## 目标：应对更难的题目，在时间压力下进行练习

### Day 15-16: Graphs
### 第 15-16 天：图
**Concepts to nail (需要掌握的核心概念):**
- BFS for shortest path (BFS 用于最短路径)
- DFS for exploration/cycle detection (DFS 用于探索/环检测)
- Topological sort (拓扑排序)

| # | Problem (题目) | Difficulty (难度) | Pattern (模式/技巧) | LeetCode # |
|---|---------|------------|---------|------------|
| 1 | Number of Islands (岛屿数量) | Medium (中等) | DFS/BFS | 200 |
| 2 | Clone Graph (克隆图) | Medium (中等) | DFS + Hash (DFS+哈希) | 133 |
| 3 | Pacific Atlantic Water Flow (太平洋大西洋水流问题) | Medium (中等) | Multi-source BFS (多源BFS) | 417 |
| 4 | Course Schedule (课程表) | Medium (中等) | Topological Sort (拓扑排序) | 207 |
| 5 | Course Schedule II (课程表 II) | Medium (中等) | Topological Sort (拓扑排序) | 210 |
| 6 | Number of Connected Components (无向图中连通分量的数目) | Medium (中等) | Union Find/DFS (并查集/DFS) | 323 |
| 7 | Graph Valid Tree (以图判树) | Medium (中等) | Cycle Detection (环检测) | 261 |
| 8 | Word Ladder (单词接龙) | Hard (困难) | BFS | 127 |

### Day 17: Heaps
### 第 17 天：堆
**Concepts to nail (需要掌握的核心概念):**
- Min heap vs max heap (最小堆 vs 最大堆)
- K-element problems (前 K 个元素问题)
- Two-heap pattern (双堆模式)

| # | Problem (题目) | Difficulty (难度) | Pattern (模式/技巧) | LeetCode # |
|---|---------|------------|---------|------------|
| 1 | Kth Largest Element in Array (数组中的第K个最大元素) | Medium (中等) | Heap (堆) | 215 |
| 2 | K Closest Points to Origin (最接近原点的 K 个点) | Medium (中等) | Heap (堆) | 973 |
| 3 | Find Median from Data Stream (数据流的中位数) | Hard (困难) | Two Heaps (双堆) | 295 |
| 4 | Task Scheduler (任务调度器) | Medium (中等) | Heap + Greedy (堆+贪心) | 621 |

### Day 18: Tries
### 第 18 天：字典树 (Tries)
**Concepts to nail (需要掌握的核心概念):**
- Trie structure (字典树结构)
- Prefix matching (前缀匹配)
- Word search applications (单词搜索应用)

| # | Problem (题目) | Difficulty (难度) | Pattern (模式/技巧) | LeetCode # |
|---|---------|------------|---------|------------|
| 1 | Implement Trie (实现 Trie) | Medium (中等) | Core (核心) | 208 |
| 2 | Design Add and Search Words (添加与搜索单词) | Medium (中等) | Trie + DFS (字典树+DFS) | 211 |
| 3 | Word Search II (单词搜索 II) | Hard (困难) | Trie + Backtrack (字典树+回溯) | 212 |

### Day 19-20: Dynamic Programming
### 第 19-20 天：动态规划
**Concepts to nail (需要掌握的核心概念):**
- Identify subproblems (识别子问题)
- Memoization vs tabulation (记忆化 vs 递推打表)
- Common patterns (1D, 2D, intervals) (常见模式：一维、二维、区间)

| # | Problem (题目) | Difficulty (难度) | Pattern (模式/技巧) | LeetCode # |
|---|---------|------------|---------|------------|
| 1 | Climbing Stairs (爬楼梯) | Easy (简单) | 1D DP (一维DP) | 70 |
| 2 | House Robber (打家劫舍) | Medium (中等) | 1D DP (一维DP) | 198 |
| 3 | Coin Change (零钱兑换) | Medium (中等) | 1D DP (一维DP) | 322 |
| 4 | Longest Increasing Subsequence (最长递增子序列) | Medium (中等) | 1D DP (一维DP) | 300 |
| 5 | Unique Paths (不同路径) | Medium (中等) | 2D DP (二维DP) | 62 |
| 6 | Longest Common Subsequence (最长公共子序列) | Medium (中等) | 2D DP (二维DP) | 1143 |
| 7 | Word Break (单词拆分) | Medium (中等) | 1D DP (一维DP) | 139 |
| 8 | Edit Distance (编辑距离) | Hard (困难) | 2D DP (二维DP) | 72 |

### Day 21: MOCK INTERVIEW 1
### 第 21 天：模拟面试 1
**Format (形式):** 45 minutes, no IDE, talk out loud (45 分钟，无 IDE，边写边说出思路)
- Pick 1 Medium + 1 Medium/Hard from any topic (随机挑选 1 道中等题 + 1 道中等/困难题)
- Time yourself strictly (严格计时)
- Record yourself if possible to review (如果可能，录像以便回顾)

---

# WEEK 4: POLISH & REST
# 第 4 周：打磨与休息

### Day 22: Review Weak Areas
### 第 22 天：复习薄弱环节
- Go through problems you struggled with (回顾你之前做得很挣扎的题目)
- Re-implement without looking at solutions (不看答案重新实现一遍)
- Focus on explaining your thought process (重点练习解释你的思考过程)

### Day 23: MOCK INTERVIEW 2
### 第 23 天：模拟面试 2
- Fresh problems you haven't seen (找一些没见过的全新题目)
- Ask a friend to interview you if possible (如果可能，请朋友来面试你)
- Or use Pramp/interviewing.io (或者使用 Pramp / interviewing.io)

### Day 24: Light Practice + Prep
### 第 24 天：轻量练习 + 准备
- 2-3 easy/medium problems to stay sharp (做 2-3 道简单/中等题保持手感)
- Review your templates one more time (再复习一遍你的模板)
- Prepare questions for your interviewer (准备向面试官提问的问题)

### Day 25 (April 15): REST
### 第 25 天：休息
- Light review only (read through templates) (仅做轻量回顾，过一遍模板)
- Get good sleep (保证充足睡眠)
- Prepare logistics (test video/audio, quiet space) (准备后勤工作：测试音视频，找个安静的房间)

---

# GOOGLE-SPECIFIC TIPS
# GOOGLE 面试特供技巧

## What Google Looks For (Google 看重什么):
1. **Problem decomposition (问题分解能力)** - Break complex problems into smaller parts (把复杂问题拆解成小部分)
2. **Communication (沟通能力)** - Think out loud, explain trade-offs (说出你的想法，解释权衡取舍)
3. **Code quality (代码质量)** - Clean, readable, handles edge cases (干净、可读，处理边界情况)
4. **Optimization (优化能力)** - Start simple, improve iteratively (从简单解法开始，逐步优化)
5. **Testing mindset (测试思维)** - Verify your solution works (验证你的解法是否有效)

## Common Google Question Types (常见的 Google 题型):
- String manipulation with constraints (带有特定约束的字符串处理)
- Graph problems (especially BFS/DFS) (图论问题，尤其是 BFS/DFS)
- Tree problems (especially BST operations) (树问题，尤其是 BST 操作)
- Dynamic programming (optimization, counting) (动态规划：优化、计数)
- System design elements (for FDE role) (系统设计元素，针对 FDE 岗位)

## Edge Cases to ALWAYS Check (永远要检查的边界情况):
- Empty input (空输入)
- Single element (单个元素)
- All same elements (所有元素都相同)
- Sorted/reverse sorted (已排序/逆序)
- Negative numbers (负数)
- Integer overflow (use Python, no issue) (整数溢出，使用 Python 则无需担心)
- Null/None values (Null/None 值)

## Red Flags to Avoid (需要避免的雷区):
- Jumping into code without understanding the problem (还没理解题目就开始写代码)
- Not asking clarifying questions (不提问澄清需求)
- Silent coding (一声不吭地写代码)
- Giving up when stuck (ask for hints!) (卡住就直接放弃，应该主动要提示！)
- Not testing your code (不测试自己的代码)
- Defensive when receiving feedback (收到反馈时带有防御/抵触情绪)

---

# DAILY PRACTICE STRUCTURE
# 每日练习结构建议

## Ideal Daily Session (3-4 hours) (理想的每日练习时长 3-4 小时):

### Warm-up (20 min) (热身 20 分钟)
- 1 Easy problem you've done before (1 道做过的简单题)
- Focus on speed and clean code (重点关注速度和整洁的代码)

### Main Practice (90-120 min) (核心练习 90-120 分钟)
- 2-3 new problems at your current level (2-3 道当前水平的新题)
- Take your time, understand deeply (慢慢来，深入理解)
- If stuck >20 min, look at hints (not solution) (卡住 >20 分钟，看提示而不是答案)
- If stuck >30 min, study the solution, then re-implement (卡住 >30 分钟，学习答案，然后重新实现)

### Review (30 min) (复盘 30 分钟)
- Add patterns to your notes (把模式加入笔记)
- Review what made you stuck (回顾什么让你卡住了)
- Practice explaining the solution out loud (练习大声讲出解法)

### Template Practice (20 min) (模板练习 20 分钟)
- Type out 2-3 templates from memory (凭记忆敲出 2-3 个模板)
- No looking at reference (不看参考资料)
