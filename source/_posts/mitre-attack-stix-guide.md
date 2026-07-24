---
title: MITRE ATT&CK Enterprise STIX 数据详解
date: 2026-07-15 20:00:00
categories:
  - 技术
  - 网络安全
tags:
  - MITRE ATT&CK
  - STIX
  - 威胁情报
---

> 本文系统讲解 MITRE ATT&CK Enterprise STIX 2.1 数据的内容、概念、对象类型、字段结构与关联关系，并给出可运行的解析示例。

---

## 一、概述与数据来源

**MITRE ATT&CK**（Adversarial Tactics, Techniques, and Common Knowledge）是基于真实世界观察的全球可访问对抗战术和技术知识库，被安全社区广泛用于威胁检测、威胁狩猎、红蓝队演练和安全控制验证。

ATT&CK 框架分为三个域：
- **Enterprise**：企业 IT 环境（Windows / Linux / macOS / 云 / 容器等）
- **Mobile**：移动设备环境
- **ICS**：工业控制系统环境

本文解析的是 **Enterprise 域**的 STIX 数据。

### 数据来源

| 属性 | 值 |
|------|-----|
| 仓库地址 | [mitre-attack/attack-stix-data](https://github.com/mitre-attack/attack-stix-data) |
| 文件路径 | `enterprise-attack/enterprise-attack.json`（master 分支） |
| 文件大小 | ~53MB |
| STIX 版本（spec_version） | **2.1** |
| 对象总数（objects） | 25,843 |
| 对象类型数（distinct type） | 16 |
| 关系对象数（relationship） | 21,025 |

**数据用途**：作为机器可读的"单一事实源"，供安全产品（SIEM、EDR、威胁情报平台）导入、检索与可视化，也适合用脚本批量提取（如生成中文对照表、构建攻击图谱）。

---

## 二、STIX 2.1 核心概念

STIX（Structured Threat Information Expression）是一种结构化网络威胁情报表达标准，采用 JSON 格式。STIX 2.1 用两类对象描述威胁信息：

| 概念 | 全称 | 说明 |
|------|------|------|
| **SDO** | STIX Domain Object（域对象） | 描述"事物"本身，如攻击模式（`attack-pattern`）、恶意软件（`malware`）、威胁组织（`intrusion-set`）、身份（`identity`）等 |
| **SRO** | STIX Relationship Object（关系对象） | 描述"事物之间的联系"，即 `relationship` 类型，用 `source_ref` / `target_ref` 指向两个对象的 ID |


### 2.1 公共属性

几乎每个对象都带如下公共字段：

| 字段 | 说明 |
|------|------|
| `type` | 对象类型，如 `attack-pattern`、`relationship` |
| `spec_version` | STIX 规范版本，通常为 `2.1` |
| `id` | STIX ID，形如 `attack-pattern--<UUID>`；全局唯一 |
| `created` / `modified` | 创建/修改时间（ISO 8601） |
| `created_by_ref` | 创建者引用，通常指向一个 `identity` 对象 |
| `object_marking_refs` | 标记引用数组，指向 `marking-definition`（如 TLP 分级） |
| `external_references` | 外部引用数组；ATT&CK 通过它挂载官方 ID 与网址 |
| `x_mitre_*` 前缀字段 | ATT&CK 对 STIX 的专有扩展字段 |
| `revoked` | 布尔；为 `true` 表示该对象已被新版本取代 |
| `x_mitre_deprecated` | 布尔；为 `true` 表示该对象已弃用 |

### 2.2 ATT&CK ID 提取方法

ATT&CK 的"人读 ID"（如 `T1059`、`TA0002`）并不在对象的 `id` 字段里（那里是 UUID），而是通过 `external_references` 挂载：

```json
{
  "external_references": [
    {
      "source_name": "mitre-attack",
      "external_id": "T1059",
      "url": "https://attack.mitre.org/techniques/T1059"
    }
  ]
}
```

解析时，遍历 `external_references`，取 `source_name == "mitre-attack"` 的 `external_id`，即可拿到 `Txxxx` / `TAxxxx`。这是把对象与其 ATT&CK 编号对应的**关键步骤**。

### 2.3 marking-definition 与 identity

- **marking-definition**（本文件 1 个）：描述数据标记，最常见的是 **TLP（Traffic Light Protocol）** 分级，控制信息的共享范围（如 WHITE / GREEN / AMBER / RED）。
- **identity**（本文件 1 个）：描述数据归属方。本文件中即 MITRE 自身，通过 `created_by_ref` 关联到各对象，表示"这条 ATT&CK 条目由 MITRE 发布"。

### 2.4 x-mitre-* 自定义扩展字段

ATT&CK 在标准 STIX 基础上增加了 `x-mitre-*` 前缀的自定义字段，常见的有：

| 字段 | 说明 |
|------|------|
| `x_mitre_shortname` | 战术短名称（小写），用于技术-战术关联 |
| `x_mitre_platforms` | 适用平台列表 |
| `x_mitre_domains` | 所属域（如 `enterprise-attack`） |
| `x_mitre_is_subtechnique` | 是否为子技术 |
| `x_mitre_data_sources` | 可检测该技术的数据源 |
| `x_mitre_deprecated` | 是否已弃用 |

---

## 三、ATT&CK 对象类型详解

### 3.1 战术（Tactic）— x-mitre-tactic

战术代表攻击者在攻击过程中的**战术目标**，是攻击链的各个阶段。

| 关键字段 | 说明 |
|----------|------|
| `name` | 英文名称，如 `Execution` |
| `x_mitre_shortname` | 短名（小写），如 `execution`；是技术↔战术的**关联键** |
| `external_references[].external_id` | 战术编号 `TAxxxx` |
| `description` | 该阶段的目标描述 |

#### 15 个战术完整列表（按攻击链顺序）

| TA_ID | 英文名称 | 中文名称 | 说明 |
|-------|----------|----------|------|
| TA0043 | Reconnaissance | 侦察 | 攻击者在试图利用目标之前收集信息 |
| TA0042 | Resource Development | 资源开发 | 攻击者建立可用于攻击的资源（基础设施、账号、能力） |
| TA0001 | Initial Access | 初始访问 | 攻击者试图进入你的网络（钓鱼、利用公网应用等） |
| TA0002 | Execution | 执行 | 攻击者试图在你的系统上运行恶意代码 |
| TA0003 | Persistence | 持久化 | 攻击者试图保持访问权限（重启、改密码后仍能访问） |
| TA0004 | Privilege Escalation | 权限提升 | 攻击者试图获得更高的系统权限 |
| TA0112 | Defense Impairment | 防御削弱 | 攻击者主动禁用/破坏防御机制（v16 新增） |
| TA0005 | Stealth | 隐蔽 | 攻击者通过隐藏行为避免被检测（原 Defense Evasion 改名） |
| TA0006 | Credential Access | 凭证访问 | 攻击者试图窃取账户名和密码 |
| TA0007 | Discovery | 发现 | 攻击者试图了解你的环境（系统、网络、用户等） |
| TA0008 | Lateral Movement | 横向移动 | 攻击者试图在网络中从一台主机移动到另一台 |
| TA0009 | Collection | 收集 | 攻击者试图从环境中收集目标数据 |
| TA0011 | Command and Control | 命令与控制 | 攻击者试图与被控系统通信 |
| TA0010 | Exfiltration | 数据渗出 | 攻击者试图从你的网络中窃取数据 |
| TA0040 | Impact | 影响 | 攻击者试图操纵、中断或破坏系统和数据 |

> **版本变更说明**：最新版（v16）中，原 `TA0005 Defense Evasion（防御规避）` 拆分为两个战术：
> - **TA0112 Defense Impairment（防御削弱）**：主动禁用/破坏防御机制
> - **TA0005 Stealth（隐蔽）**：隐藏行为避免检测
>
> 解析战术时不要假设编号与旧版名称一一对应。

战术对象关键字段示例：

```json
{
  "type": "x-mitre-tactic",
  "id": "x-mitre-tactic--4ca45d45-df4d-4613-8980-bf49ef4e7f56",
  "name": "Execution",
  "x_mitre_shortname": "execution",
  "x_mitre_domains": ["enterprise-attack"],
  "external_references": [
    {
      "source_name": "mitre-attack",
      "external_id": "TA0002",
      "url": "https://attack.mitre.org/tactics/TA0002"
    }
  ]
}
```

### 3.2 技术/子技术（Technique / Sub-technique）— attack-pattern

技术代表攻击者如何实现战术目标的**具体方法**；子技术是某技术的更细粒度划分。

| 关键字段 | 说明 |
|----------|------|
| `name` | 英文名称，如 `Command and Scripting Interpreter` |
| `x_mitre_is_subtechnique` | 布尔；`true` 表示子技术 |
| `external_references[].external_id` | 编号：`T1059`（技术）或 `T1059.001`（子技术） |
| `kill_chain_phases` | 数组，每项 `phase_name` 为战术 `shortname`（如 `execution`） |
| `x_mitre_platforms` | 适用平台，如 `Windows` / `Linux` / `macOS` |
| `x_mitre_data_sources` | 可检测该技术的数据源 |
| `x_mitre_defense_bypassed` | 该技术可绕过的防御机制 |
| `x_mitre_detection` | 检测建议 |
| `description` | 技术描述与示例 |

本文件原始 `attack-pattern` 共 858 个，其中包含已弃用/已撤销对象；过滤后实际有效：

| 类型 | 有效数量 |
|------|---------|
| 技术（Technique） | 222 |
| 子技术（Sub-technique） | 475 |
| **合计** | **697** |

#### 平台分布统计

| 平台 | 技术数量 |
|------|---------|
| Windows | 474 |
| macOS | 356 |
| Linux | 355 |
| ESXi | 117 |
| IaaS | 104 |
| Network Devices | 100 |
| PRE（攻击准备） | 96 |
| Office Suite | 78 |
| SaaS | 70 |
| Containers | 48 |
| Identity Provider | 48 |

> 注：一个技术可能支持多个平台，因此总数大于技术总数。

#### 子技术示例

| 父技术 | 子技术 |
|--------|--------|
| T1059 命令和脚本解释器 | T1059.001 PowerShell |
| | T1059.002 AppleScript |
| | T1059.003 Windows Command Shell |
| | T1059.004 Unix Shell |
| | T1059.005 Visual Basic |
| | T1059.006 Python |
| | T1059.007 JavaScript |

### 3.3 矩阵（Matrix）— x-mitre-matrix

`x-mitre-matrix` 只有 **1** 个，它用 `tactic_refs`（战术 ID 数组）声明 Enterprise 矩阵的战术从左到右的排列顺序，是构建可视化矩阵的**骨架**。

```json
{
  "type": "x-mitre-matrix",
  "id": "x-mitre-matrix--eafc1b4c-b985-4bd0-9a37-cc6052a3b596",
  "name": "Enterprise ATT&CK",
  "tactic_refs": [
    "x-mitre-tactic--2558fd61-8c75-4730-94c4-11926db2a263",
    "x-mitre-tactic--d3920665-1c55-4aee-a49e-07e0ca09e065",
    ...
  ]
}
```

`tactic_refs` 数组的顺序即 ATT&CK 官网上矩阵从左到右的战术列顺序。解析时应以 `tactic_refs` 而非 `external_id` 的数字大小来决定战术排列。

### 3.4 威胁组织（Intrusion Set）— intrusion-set

威胁组织（也称为 APT 组织、威胁团伙）代表已知的威胁行为者，是具有共同归因的一组恶意活动。

| 关键字段 | 说明 |
|----------|------|
| `name` | 组织名称（MITRE 命名，如 APT28） |
| `aliases` | 别名列表（厂商命名、公开名称等） |
| `description` | 组织背景、活动时间、目标行业等 |

本文件活跃入侵组织 **174** 个（含弃用共 189 个），包括知名的 APT28、APT29、Lazarus Group、FIN7 等。

组织通过 `uses` 关系关联使用的技术和软件，通过 `attributed-to` 关系关联战役。

### 3.5 软件（Software）— malware + tool

软件分为两类：

| 类型 | STIX type | 活跃数量 | 说明 |
|------|-----------|---------|------|
| 恶意软件 | `malware` | 726 | RAT、木马、勒索软件、后门等（含弃用共 729） |
| 工具 | `tool` | 95 | 合法工具被攻击者滥用（PsExec、Mimikatz 等） |
| **合计** | | **821** | |

> 注：Mimikatz 在 ATT&CK 中归类为 Tool（工具），不是 Malware。

软件对象关键字段：

| 字段 | 说明 |
|------|------|
| `is_family` | 是否为恶意软件家族（布尔值） |
| `x_mitre_platforms` | 支持平台 |
| `x_mitre_aliases` | 别名 |

软件通过 `uses` 关系关联到使用的技术。

### 3.6 战役（Campaign）— campaign

战役是一组在特定时间窗口内针对特定目标发生的、具有共同归因的恶意活动。

- 活跃数量：**56** 个
- 有明确的时间范围（`first_seen`、`last_seen`）
- 通过 `attributed-to` 关系归属到组织
- 通过 `uses` 关系关联使用的技术和软件

### 3.7 缓解措施（Course of Action）— course-of-action

缓解措施代表可以防止技术成功执行的安全配置、最佳实践或工具。

- **活跃数量：44 个**（含弃用共 268 个）
- 通过 `mitigates` 关系关联到对应的技术

常见缓解措施：

| ID | 名称 |
|----|------|
| M1049 | Antivirus/Antimalware |
| M1042 | Disable or Remove Feature or Program |
| M1038 | Execution Prevention |
| M1026 | Privileged Account Management |
| M1017 | User Training |
| M1051 | Update Software |
| M1032 | Multi-factor Authentication |

### 3.8 数据源体系（Data Source / Data Component）

数据源代表可用于检测行为的信息来源，数据组件是数据源下的具体事件类型。

| 类型 | ID 前缀 | 数量 | 说明 |
|------|---------|------|------|
| Data Source | DSxxxx | 38 | 如 Process、File、Network、Registry 等 |
| Data Component | 无单独 ID | 109 | 如 Process Creation、File Modification 等 |

数据组件是技术 `x_mitre_data_sources` 字段实际引用的单位，通过 `detects` 关系关联到技术。

主要数据源分类：

- **进程相关**：Process Creation、Process Termination、Process Access
- **文件相关**：File Creation、File Modification、File Deletion
- **网络相关**：Network Connection、Network Traffic、DNS Query
- **注册表相关**：Registry Key Creation、Registry Value Modification
- **认证相关**：Logon Session、Authentication Event
- **命令行相关**：Command Execution、Script Execution

### 3.9 分析与检测（Analytic / Detection Strategy / Collection）

| 类型 | 数量 | 说明 |
|------|------|------|
| `x-mitre-analytic` | 1,758 | 具体的检测分析逻辑（如 Sigma 规则片段） |
| `x-mitre-detection-strategy` | 699 | 检测策略，通过 `detects` 关系指向被检测的技术 |
| `x-mitre-collection` | 1 | 数据集合元信息 |

检测对象描述了如何利用数据源检测特定技术，包含检测逻辑、所需数据源、误报说明和检测置信度等。

---

## 四、对象间关联关系（SRO）

ATT&CK 的知识价值很大程度来自对象之间的 `relationship`。

### 4.1 核心关系类型

| relationship_type | 含义 | source（起点） | target（终点） | 数量 |
|-------------------|------|---------------|----------------|-----:|
| `uses` | 采用 | 组织/软件/战役 | 技术/子技术/软件 | 18,220 |
| `mitigates` | 缓解 | 缓解措施 | 技术/子技术 | 1,448 |
| `detects` | 检测 | 检测策略 | 技术/子技术 | 697 |
| `subtechnique-of` | 属于 | 子技术 | 父技术 | 477 |
| `revoked-by` | 被取代 | 旧对象 | 新对象 | 157 |
| `attributed-to` | 归属 | 战役 | 威胁组织 | 26 |

### 4.2 关系方向与知识图谱

关系是有方向的，`source_ref`（源）和 `target_ref`（目标）不要搞反。通过关系可以构建完整的攻击知识图谱：

```
组织(Gxxxx)
    ↓ uses
技术(Txxxx) ← mitigates ← 缓解措施(Mxxxx)
    ↑                        ↑
    │ subtechnique-of        │ detects
    │                        │
子技术(Txxxx.xxx)        数据组件(DSxxxx)
    ↑ uses
软件(Sxxxx)
```

### 4.3 三种核心导航路径

1. **技术 ↔ 战术**：技术对象内 `kill_chain_phases[].phase_name` 与战术的 `x_mitre_shortname` 对应，**无需经过 relationship**
2. **子技术 ↔ 父技术**：通过 `subtechnique-of` 关系（source=子技术，target=父技术）
3. **组织/软件 → 技术**：通过 `uses` 关系

### 4.4 典型查询路径

| 查询场景 | 关系路径 |
|----------|---------|
| 某组织使用的技术 | `intrusion-set --uses--> attack-pattern` |
| 某技术的检测方法 | `detection-strategy --detects--> attack-pattern` |
| 某技术的缓解措施 | `course-of-action --mitigates--> attack-pattern` |
| 某恶意软件使用的技术 | `malware --uses--> attack-pattern` |
| 某技术的子技术 | `sub_attack-pattern --subtechnique-of--> parent_attack-pattern` |

### 4.5 external_references 详解

`external_references` 数组中常见的 `source_name`：

| source_name | 说明 | 示例 |
|-------------|------|------|
| `mitre-attack` | ATT&CK 官方引用（包含 ID） | `"external_id": "T1059"` |
| `capec` | CAPEC 攻击模式分类 | `"external_id": "CAPEC-555"` |
| `cve` | CVE 漏洞编号 | `"external_id": "CVE-2021-44228"` |
| 厂商名称 | Microsoft、FireEye、CrowdStrike 等 | 技术报告、博客链接 |

关系对象示例：

```json
{
  "type": "relationship",
  "id": "relationship--xxxx",
  "relationship_type": "uses",
  "source_ref": "intrusion-set--899ce53f-1df9-4d77-920c-86a0d49a2c1f",
  "target_ref": "attack-pattern--d3619aa1-c2e1-488d-8d99-0f27d0b29f35",
  "description": "APT28 has used PowerShell for execution."
}
```

---

## 五、实战解析

### 5.1 Python 解析脚本

以下脚本可直接读取 `enterprise-attack.json` 并输出统计（Python 3.8+，仅标准库）：

```python
# -*- coding: utf-8 -*-
import json
from collections import Counter

SRC = "enterprise-attack.json"

def load(path):
    """加载 STIX JSON，返回 objects 数组"""
    with open(path, encoding="utf-8") as f:
        return json.load(f)["objects"]

def ext_id(o):
    """从 external_references 提取 ATT&CK ID"""
    for r in o.get("external_references", []):
        if r.get("source_name") == "mitre-attack":
            return r.get("external_id")
    return None

def active(o):
    """判断对象是否为活跃状态（未弃用且未撤销）"""
    return not o.get("x_mitre_deprecated") and not o.get("revoked")

objs = load(SRC)

# 1) 对象类型计数
type_counts = Counter(o.get("type") for o in objs)
print("总对象数:", len(objs))
print("关系数:", type_counts.get("relationship", 0))

# 2) 过滤出有效战术/技术/子技术
tactics = [o for o in objs if o.get("type") == "x-mitre-tactic" and active(o)]
techs = [o for o in objs if o.get("type") == "attack-pattern" and active(o)
         and not o.get("x_mitre_is_subtechnique")]
subs  = [o for o in objs if o.get("type") == "attack-pattern" and active(o)
         and o.get("x_mitre_is_subtechnique")]
print("战术:", len(tactics), "| 技术:", len(techs), "| 子技术:", len(subs))

# 3) 技术 -> 战术（通过 kill_chain_phases）
tac_short = {t["x_mitre_shortname"]: ext_id(t) for t in tactics}
t1059 = next(o for o in techs if ext_id(o) == "T1059")
phases = [p["phase_name"] for p in t1059.get("kill_chain_phases", [])]
print("T1059 所属战术:", phases)
print("T1059 平台:", t1059.get("x_mitre_platforms"))

# 4) 子技术（通过 subtechnique-of 关系）
id_map = {o["id"]: o for o in objs}
sub_names = []
for o in objs:
    if o.get("type") == "relationship" and o.get("relationship_type") == "subtechnique-of":
        if ext_id(id_map.get(o["target_ref"])) == "T1059":
            s = id_map.get(o["source_ref"])
            sub_names.append((ext_id(s), s.get("name")))
print("T1059 子技术:", sub_names)
```

### 5.2 T1059 完整 Walkthrough：顺关系游走

以 `T1059 Command and Scripting Interpreter（命令和脚本解释器）` 为例，展示如何从一个技术节点出发，沿关系网络游走重建完整上下文。

**第 1 步：定位技术对象**

```json
{
  "type": "attack-pattern",
  "id": "attack-pattern--7385dfaf-6886-4229-9ecd-6fd678040830",
  "name": "Command and Scripting Interpreter",
  "x_mitre_is_subtechnique": false,
  "kill_chain_phases": [
    { "kill_chain_name": "mitre-attack", "phase_name": "execution" }
  ],
  "x_mitre_platforms": ["Containers", "ESXi", "IaaS", "Identity Provider",
    "Linux", "macOS", "Network Devices", "Office Suite", "SaaS", "Windows"]
}
```

**第 2 步：战术归属**

`kill_chain_phases.phase_name = execution` → 对应战术 **TA0002 Execution**。

**第 3 步：子技术（subtechnique-of）**

T1059 共有 **13** 个子技术：

| 子技术 ID | 名称 |
|-----------|------|
| T1059.001 | PowerShell |
| T1059.002 | AppleScript |
| T1059.003 | Windows Command Shell |
| T1059.004 | Unix Shell |
| T1059.005 | Visual Basic |
| T1059.006 | Python |
| T1059.007 | JavaScript |
| T1059.008 | Network Device CLI |
| T1059.009 | Cloud API |
| T1059.010 | AutoHotKey & AutoIT |
| T1059.011 | Lua |
| T1059.012 | Hypervisor CLI |
| T1059.013 | Container CLI/API |

**第 4 步：采用该技术的软件（uses，source=malware/tool）**

共有 **23** 个软件 uses 了 T1059（展示前 12 个）：DarkComet、StarProxy、CHOPSTICK、Donut、FIVEHANDS、Matryoshka、Imminent Monitor、Kessel、ZeroCleare、gh0st RAT、P.A.S. Webshell、WINERACK。

**第 5 步：采用该技术的威胁组织（uses，source=intrusion-set）**

共有 **17** 个组织 uses 了 T1059（展示前 12 个）：Fox Kitten、Stealth Falcon、Winter Vivern、FIN7、FIN6、FIN5、APT19、APT32、Dragonfly、Saint Bear、Whitefly、APT39。

**第 6 步：缓解措施（mitigates）**

共有 **9** 条缓解措施 mitigates T1059：

| 缓解措施 |
|----------|
| Limit Software Installation |
| Code Signing |
| Disable or Remove Feature or Program |
| Execution Prevention |
| Antivirus/Antimalware |
| Privileged Account Management |
| Audit |
| Restrict Web-Based Content |
| Behavior Prevention on Endpoint |

**第 7 步：检测策略（detects）**

共有 **1** 个检测策略 detects T1059：

| 检测策略 |
|----------|
| Behavioral Detection of Command and Scripting Interpreter Abuse |

> 通过这七个步骤，你可以从一个技术节点出发，完整重建它在 ATT&CK 知识图谱中的上下文——这正是安全产品做"技术影响面分析"和"检测覆盖度评估"的基础。

### 5.3 废弃与撤销对象处理

| 状态 | 字段 | 处理方式 |
|------|------|----------|
| Deprecated（废弃） | `x_mitre_deprecated: true` | 该技术已不再推荐使用（合并或拆分） |
| Revoked（撤销） | `revoked: true` | 该 ID 已被撤销，通过 `revoked-by` 关系指向新对象 |

**处理建议**：
1. 解析时过滤掉这两类对象，不展示给用户
2. 如需兼容旧 ID，通过 `revoked-by` 关系链映射到新 ID
3. 本文件有 157 个 `revoked-by` 关系

### 5.4 ATT&CK 矩阵可视化原理

ATT&CK 矩阵是一个二维表格：
- **列**：战术（按 `x-mitre-matrix` 的 `tactic_refs` 顺序排列）
- **行**：技术
- **单元格**：属于该战术的技术

构建步骤：
1. 获取 `x-mitre-matrix` 对象的 `tactic_refs` 数组，确定战术列顺序
2. 对每个技术，根据 `kill_chain_phases` 中的 `phase_name` 分配到对应战术列
3. 子技术显示在父技术下方（缩进）
4. 已废弃/已撤销的对象不显示

---

## 六、速查表与常见坑

### 6.1 对象类型速查

| type | 含义 | 有效/总数 |
|------|------|----------:|
| `x-mitre-tactic` | 战术 | 15 |
| `attack-pattern` | 技术/子技术 | 697 / 858 |
| `x-mitre-matrix` | 矩阵 | 1 |
| `course-of-action` | 缓解措施 | 44 / 268 |
| `intrusion-set` | 威胁组织 | 174 / 189 |
| `malware` | 恶意软件 | 726 / 729 |
| `tool` | 工具 | 95 |
| `campaign` | 战役 | 56 |
| `x-mitre-data-source` | 数据源 | 38 |
| `x-mitre-data-component` | 数据组件 | 109 |
| `x-mitre-analytic` | 分析逻辑 | 1,758 |
| `x-mitre-detection-strategy` | 检测策略 | 699 |
| `x-mitre-collection` | 集合元信息 | 1 |
| `identity` | 身份/归属方 | 1 |
| `marking-definition` | 标记（TLP） | 1 |
| `relationship` | 关系 | 21,025 |

### 6.2 关系类型速查

| relationship_type | 含义 | 数量 |
|-------------------|------|-----:|
| `uses` | 采用 | 18,220 |
| `mitigates` | 缓解 | 1,448 |
| `detects` | 检测 | 697 |
| `subtechnique-of` | 属于 | 477 |
| `revoked-by` | 被取代 | 157 |
| `attributed-to` | 归属 | 26 |

### 6.3 ATT&CK ID 前缀速查

| 前缀 | 对象类型 | 示例 |
|------|----------|------|
| TA | 战术 | TA0002 Execution |
| T | 技术 | T1059 Command and Scripting Interpreter |
| T.xxxx | 子技术 | T1059.001 PowerShell |
| G | 组织 | G0007 APT28 |
| S | 软件 | S0002 PsExec |
| C | 战役 | C0027 |
| M | 缓解措施 | M1049 Antivirus |
| DS | 数据源 | DS0009 Process |

### 6.4 常见坑

1. **务必过滤 `revoked` / `x_mitre_deprecated`**：否则统计数字虚高（如原始 attack-pattern 858 个，过滤后仅 697 个有效）
2. **STIX 版本是 2.1 不是 2.0**：`enterprise-attack.json` 的 `spec_version` 为 `2.1`
3. **版本间改名/新增**：如 `defense-evasion` → `stealth`、新增 `TA0112 Defense Impairment`。不要硬编码战术名称或编号映射
4. **关系方向**：`source_ref` 和 `target_ref` 有方向，不要搞反（如 `uses` 的 source 是组织/软件，target 是技术）
5. **多战术归属**：一个技术可能属于多个战术（`kill_chain_phases` 是数组），不要假设一对一关系
6. **子技术平台可不同**：子技术会继承父技术的一些属性，但平台等字段可能与父技术不同
7. **官方数据无中文**：STIX 导出仅含英文，中文翻译需依赖社区资源（如 `seccmd/Attack_CN` 项目）
8. **HTML 清理**：`description` 字段包含 HTML 标签，展示前需要清理

---

*基于 MITRE ATT&CK Enterprise STIX 数据（spec_version 2.1）*
*数据来源：[mitre-attack/attack-stix-data](https://github.com/mitre-attack/attack-stix-data)*
