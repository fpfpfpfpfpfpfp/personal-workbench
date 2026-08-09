const STORAGE_KEY = "personal-workbench-data-v1";
const KEY_HASH_STORAGE = "personal-workbench-key-v1";
const forcedReadonly = new URLSearchParams(window.location.search).get("view") === "readonly";
const PROTECTED_CATEGORY = "life";
const SETTINGS_CATEGORY = "settings";
const ENCRYPTION_STORAGE = "personal-workbench-encryption-v1";
const AVATAR_STORAGE = "personal-workbench-avatar-v1";
const CUSTOM_CATEGORIES_STORAGE = "personal-workbench-custom-categories-v1";
const KNOWLEDGE_METADATA_STORAGE = "personal-workbench-knowledge-metadata-v1";
const PROTECTED_SESSION_KEY = "personal-workbench-life-unlocked";
const PROTECTED_PASSWORD_STORAGE = "personal-workbench-life-password-v1";
const PROTECTED_PASSWORD_HASH = "8d23cf6c86e834a7aa6eded54c26ce2bb2e74903538c61bdd5d2197997ab2f72";
const RECOVERY_ANSWER_HASHES = new Set([
  "3c7623c7d5356328d1a96257f2f8697d75bfa2276f180df58e953e776606c81e",
  "049addc4df03dffa0d484875977105f4c913b86563fbe28c9407766691ea4bdc",
]);
const remoteConfig = window.WORKBENCH_REMOTE || {};
let activeEditorPassword = null;
let graphRuntime = null;

const knowledgeTypeLabels = {
  "project-memory": "项目记忆", person: "人物信息", concept: "概念与原理",
  method: "方法与经验", decision: "决策记录", "source-summary": "资料摘要",
};
const knowledgeStatusLabels = { confirmed: "已确认", review: "待验证", outdated: "已过时" };

const categories = [
  { id: "inbox", index: "00", title: "收件箱", eyebrow: "快速收集", description: "临时接住待判断、待整理的信息，再定期分配到正确位置。" },
  { id: "plans", index: "01", title: "日期与计划", eyebrow: "行动安排", description: "管理今天、本周和更长期的目标，明确下一步应该做什么。" },
  { id: "projects", index: "02", title: "进行中项目", eyebrow: "成果推进", description: "集中管理有明确目标和完成节点的事项。" },
  { id: "work", index: "03", title: "工作资料", eyebrow: "日常资源", description: "保存模板、会议记录、流程和需要反复使用的工作信息。" },
  { id: "knowledge", index: "04", title: "个人知识库", eyebrow: "长期积累", description: "沉淀经过理解、以后能够再次使用的知识与经验。" },
  { id: "content", index: "05", title: "内容与创作", eyebrow: "创作流程", description: "管理选题、素材、草稿以及已经发布的作品。" },
  { id: "tools", index: "06", title: "工具与配置", eyebrow: "环境维护", description: "记录软件、设备和数字工作环境的配置方式。" },
  { id: "life", index: "98", title: "个人文档", eyebrow: "文档管理", description: "管理个人证件、财务、健康、旅行与家庭资料。" },
  { id: "settings", index: "97", title: "工作台设置", eyebrow: "系统配置", description: "管理头像和各目录的访问保护。" },
  { id: "archive", index: "99", title: "归档", eyebrow: "历史记录", description: "保存已经完成或暂时不活跃，但未来可能需要查询的内容。" },
];

const seedItems = [
  { id: crypto.randomUUID(), category: "inbox", title: "整理本周收到的资料", body: "逐条判断：转为任务、放入项目、沉淀到知识库或直接删除。", status: "active", date: today() },
  { id: crypto.randomUUID(), category: "plans", title: "完成个人工作台第一版", body: "建立清晰目录，并确定哪些内容公开、哪些内容保持私密。", status: "active", date: today() },
  { id: crypto.randomUUID(), category: "projects", title: "共享工作台上线", body: "第一阶段先完成只读分享和本机编辑，第二阶段再接入服务器。", status: "active", date: today() },
  { id: crypto.randomUUID(), category: "knowledge", title: "目录整理原则", body: "项目有明确结果和结束时间；领域需要长期维护；知识能够被复用。", status: "done", date: today() },
];

const categoryResponsibilities = {
  plans: "管理今天、本周和长期目标，明确下一步行动。",
  projects: "放项目当前状态、任务、决策和交付物。不放已经沉淀完成的通用经验和原始会议附件。",
  work: "放合同、会议记录、流程、模板等原始资料。不放项目当前进度和从资料中提炼出的长期结论。",
  knowledge: "放整理后的项目记忆、经验、概念和人物信息。不放未经整理的大量原始文件和临时草稿。",
  content: "放选题、素材、草稿、已发布作品。不放与内容创作无关的项目文件和正式工作资料。",
  tools: "记录软件、设备、快捷指令和数字工作环境的配置方式。",
  settings: "管理工作台头像、目录职责和目录访问保护。",
  life: "管理财务、健康、证件、旅行和家庭事务。",
  archive: "保存已经完成或暂时不活跃，但未来仍可能查询的内容。",
};

const state = {
  category: "inbox",
  selectedId: null,
  filter: "all",
  search: "",
  knowledgeTypeFilter: "all",
  knowledgeProjectFilter: "all",
  knowledgeTagFilter: "all",
  knowledgePeopleFilter: "all",
  knowledgeStatusFilter: "all",
  editing: false,
  pendingCategory: null,
  recoveryMode: false,
  resettingProtectedPassword: false,
  items: loadItems(),
  customCategories: loadCustomCategories(),
};

const elements = Object.fromEntries([
  "categoryNav", "categoryEyebrow", "categoryTitle", "categoryDescription", "itemList", "emptyState", "taskFilters",
  "detailPanel", "detailEmpty", "detailForm", "detailCategory", "itemTitle", "itemStatus", "itemDate",
  "itemBody", "knowledgeFields", "itemKnowledgeType", "itemTags", "itemProject", "itemPeople", "itemKnowledgeStatus", "knowledgeSuggestions", "knowledgeSuggestionList", "refreshKnowledgeSuggestions", "knowledgeLinks", "knowledgeLinksList", "knowledgeGraph", "knowledgeGraphCanvas", "knowledgeContextButton", "knowledgeManageButton", "knowledgeManagerDialog", "knowledgeManagerContent", "closeKnowledgeManager", "tagSuggestions", "projectSuggestions", "peopleSuggestions", "knowledgeFilters", "knowledgeSummary", "knowledgeTypeFilter", "knowledgeProjectFilter", "knowledgeTagFilter", "knowledgePeopleFilter", "knowledgeStatusFilter", "newItemButton", "deleteButton", "searchInput", "editModeButton", "modeLabel", "shareButton",
  "accessDialog", "accessForm", "accessTitle", "accessDescription", "accessKey", "accessError", "cancelAccess",
  "weeklyCount", "toast", "storageNotice", "protectedDialog", "protectedForm", "protectedTitle",
  "protectedDescription", "protectedPasswordLabel", "protectedPassword", "recoveryAnswerLabel", "recoveryAnswer",
  "newProtectedPasswordLabel", "newProtectedPassword", "protectedError", "recoveryToggle", "cancelProtected"
  , "settingsPanel", "avatarMark", "avatarPreview", "avatarInput", "removeAvatar", "encryptionList", "categoryAddForm", "categoryIndexInput", "categoryTitleInput", "categoryDescriptionInput"
].map((id) => [id, document.getElementById(id)]));

function today() {
  return new Date().toISOString().slice(0, 10);
}

function loadItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || seedItems;
  } catch {
    return seedItems;
  }
}

function loadCustomCategories() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_CATEGORIES_STORAGE)) || []; } catch { return []; }
}

function allCategories() {
  return [...categories, ...state.customCategories];
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  void saveRemoteState();
}

function remoteEnabled() {
  return Boolean(remoteConfig.supabaseUrl && remoteConfig.supabaseAnonKey);
}

function remoteHeaders(includeJson = false) {
  const headers = { apikey: remoteConfig.supabaseAnonKey };
  if (remoteConfig.supabaseAnonKey.startsWith("eyJ")) {
    headers.Authorization = `Bearer ${remoteConfig.supabaseAnonKey}`;
  }
  if (includeJson) headers["Content-Type"] = "application/json";
  return headers;
}

function collectWorkbenchState() {
  return {
    items: state.items,
    customCategories: state.customCategories,
    encryption: JSON.parse(localStorage.getItem(ENCRYPTION_STORAGE) || "{}"),
    avatar: localStorage.getItem(AVATAR_STORAGE) || "",
    protectedPasswordHash: localStorage.getItem(PROTECTED_PASSWORD_STORAGE) || PROTECTED_PASSWORD_HASH,
    knowledgeMetadata: loadKnowledgeMetadata(),
  };
}

function applyWorkbenchState(data) {
  if (!data || !Array.isArray(data.items)) return false;
  state.items = data.items;
  state.customCategories = Array.isArray(data.customCategories) ? data.customCategories : [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data.items));
  localStorage.setItem(CUSTOM_CATEGORIES_STORAGE, JSON.stringify(state.customCategories));
  localStorage.setItem(ENCRYPTION_STORAGE, JSON.stringify(data.encryption || {}));
  if (data.avatar) localStorage.setItem(AVATAR_STORAGE, data.avatar); else localStorage.removeItem(AVATAR_STORAGE);
  if (data.protectedPasswordHash) localStorage.setItem(PROTECTED_PASSWORD_STORAGE, data.protectedPasswordHash);
  localStorage.setItem(KNOWLEDGE_METADATA_STORAGE, JSON.stringify(data.knowledgeMetadata || {}));
  renderSettings();
  renderCategory();
  renderDetail();
  return true;
}

async function loadRemoteState() {
  if (!remoteEnabled()) return;
  elements.storageNotice.textContent = "正在同步共享数据";
  try {
    const response = await fetch(`${remoteConfig.supabaseUrl}/rest/v1/workbench_state?id=eq.main&select=data`, {
      headers: remoteHeaders(),
    });
    if (!response.ok) throw new Error("Remote read failed");
    const rows = await response.json();
    const hasRemoteData = rows[0]?.data && Object.keys(rows[0].data).length > 0;
    if (hasRemoteData) applyWorkbenchState(rows[0].data);
    elements.storageNotice.textContent = "共享数据已同步";
  } catch {
    elements.storageNotice.textContent = "共享同步失败，正在使用本地数据";
  }
}

async function saveRemoteState() {
  const writePassword = activeEditorPassword || sessionStorage.getItem("workbench-write-password");
  if (!remoteEnabled() || !writePassword) return;
  elements.storageNotice.textContent = "正在保存共享数据";
  try {
    const response = await fetch(`${remoteConfig.supabaseUrl}/rest/v1/rpc/save_workbench_state`, {
      method: "POST",
      headers: {
        ...remoteHeaders(true),
      },
      body: JSON.stringify({ secret: writePassword, payload: collectWorkbenchState() }),
    });
    if (!response.ok) throw new Error("Remote write failed");
    elements.storageNotice.textContent = "共享数据已保存";
  } catch {
    elements.storageNotice.textContent = "云端保存失败，已保存在本机";
  }
}

async function hashKey(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function renderNav() {
  const orderedCategories = allCategories().sort((a, b) => Number(a.index) - Number(b.index));
  elements.categoryNav.innerHTML = orderedCategories.map((category) => `
    <button class="nav-button ${category.id === state.category ? "active" : ""}" data-category="${category.id}" type="button">
      <span class="nav-index">${category.index}</span>
      <span>${category.title}</span>
      ${isEncrypted(category.id) ? '<span class="nav-lock" aria-label="加密目录">加密</span>' : ""}
    </button>
  `).join("");
}

function isEncrypted(categoryId) {
  const configured = JSON.parse(localStorage.getItem(ENCRYPTION_STORAGE) || "{}");
  return configured[categoryId] ?? (categoryId === PROTECTED_CATEGORY || categoryId === SETTINGS_CATEGORY);
}

function renderSettings() {
  const avatar = localStorage.getItem(AVATAR_STORAGE);
  elements.avatarPreview.innerHTML = avatar ? `<img src="${avatar}" alt="自定义头像" />` : "W";
  elements.avatarMark.innerHTML = avatar ? `<img src="${avatar}" alt="自定义头像" />` : "W";
  elements.encryptionList.innerHTML = allCategories().filter((category) => category.index !== "00").sort((a, b) => Number(a.index) - Number(b.index)).map((category) => `
    <div class="encryption-item" data-responsibility-item="${category.id}">
      <div class="encryption-row"><button class="responsibility-button" data-responsibility="${category.id}" type="button"><span>${category.index}</span><strong>${category.title}</strong></button><button class="toggle-button ${isEncrypted(category.id) ? "on" : ""}" data-encryption="${category.id}" type="button">${isEncrypted(category.id) ? "已加密" : "未加密"}</button></div>
      <div class="responsibility-detail" hidden><p>${categoryResponsibilities[category.id] || category.description}</p></div>
    </div>
  `).join("");
}

function visibleItems() {
  const query = state.search.trim().toLowerCase();
  return state.items.filter((item) => {
    const categoryMatch = item.category === state.category;
    const filterMatch = state.category === "knowledge" || state.filter === "all" || item.status === state.filter;
    const searchable = `${item.title} ${item.body} ${item.tags || ""} ${item.project || ""} ${item.people || ""}`.toLowerCase();
    const searchMatch = !query || searchable.includes(query);
    const typeMatch = state.category !== "knowledge" || state.knowledgeTypeFilter === "all" || item.knowledgeType === state.knowledgeTypeFilter;
    const projectMatch = state.category !== "knowledge" || state.knowledgeProjectFilter === "all" || normalizeList(item.project).split(", ").includes(state.knowledgeProjectFilter);
    const tagMatch = state.category !== "knowledge" || state.knowledgeTagFilter === "all" || normalizeList(item.tags).split(", ").includes(state.knowledgeTagFilter);
    const peopleMatch = state.category !== "knowledge" || state.knowledgePeopleFilter === "all" || normalizeList(item.people).split(", ").includes(state.knowledgePeopleFilter);
    const knowledgeStatusMatch = state.category !== "knowledge" || state.knowledgeStatusFilter === "all" || normalizeKnowledgeStatus(item.knowledgeStatus) === state.knowledgeStatusFilter;
    return categoryMatch && filterMatch && searchMatch && typeMatch && projectMatch && tagMatch && peopleMatch && knowledgeStatusMatch;
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeList(value) {
  const seen = new Set();
  return String(value || "")
    .split(/[,，;；\n]+/)
    .map((entry) => entry.trim().replace(/^#+/, ""))
    .filter((entry) => {
      if (!entry) return false;
      const key = entry.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(", ");
}

function normalizeKnowledgeStatus(value) {
  if (value === "current" || value === "confirmed") return "confirmed";
  if (value === "draft" || value === "outdated") return "outdated";
  if (loadKnowledgeMetadata().customStatuses.some((entry) => entry.id === value)) return value;
  return "review";
}

function loadKnowledgeMetadata() {
  const defaults = { disabledTypes: [], disabledStatuses: [], customTypes: [], customStatuses: [], tags: [], projects: [], people: [] };
  try { return { ...defaults, ...(JSON.parse(localStorage.getItem(KNOWLEDGE_METADATA_STORAGE)) || {}) }; }
  catch { return defaults; }
}

function metadataEntries(kind) {
  const metadata = loadKnowledgeMetadata();
  const base = kind === "type" ? Object.entries(knowledgeTypeLabels).map(([id, label]) => ({ id, label, custom: false })) : Object.entries(knowledgeStatusLabels).map(([id, label]) => ({ id, label, custom: false }));
  const custom = kind === "type" ? metadata.customTypes : metadata.customStatuses;
  const disabled = new Set(kind === "type" ? metadata.disabledTypes : metadata.disabledStatuses);
  return [...base, ...custom.map((entry) => ({ ...entry, custom: true }))].filter((entry) => !disabled.has(entry.id));
}

function knowledgeTypeLabel(value) {
  return metadataEntries("type").find((entry) => entry.id === value)?.label || knowledgeTypeLabels[value] || "待分类";
}

function knowledgeStatusLabel(value) {
  const normalized = normalizeKnowledgeStatus(value);
  return metadataEntries("status").find((entry) => entry.id === normalized)?.label || knowledgeStatusLabels[normalized] || "待验证";
}

function metadataValues(field, catalogKey) {
  const metadata = loadKnowledgeMetadata();
  const used = state.items.filter((item) => item.category === "knowledge").flatMap((item) => normalizeList(item[field]).split(", ")).filter(Boolean);
  return [...new Set([...(metadata[catalogKey] || []), ...used])].sort((a, b) => a.localeCompare(b));
}

function setSelectOptions(select, entries, allLabel) {
  const current = select.value;
  select.innerHTML = `<option value="all">${allLabel}</option>${entries.map((entry) => `<option value="${escapeHtml(entry.id ?? entry)}">${escapeHtml(entry.label ?? entry)}</option>`).join("")}`;
  select.value = [...select.options].some((option) => option.value === current) ? current : "all";
}

function renderKnowledgeTypeOptions() {
  const types = metadataEntries("type");
  const statuses = metadataEntries("status");
  const currentType = elements.itemKnowledgeType.value;
  elements.itemKnowledgeType.innerHTML = '<option value="">待分类</option>' + types.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.label)}</option>`).join("");
  elements.itemKnowledgeType.value = types.some((entry) => entry.id === currentType) ? currentType : "";
  setSelectOptions(elements.knowledgeTypeFilter, types, "全部类型");
  const currentStatus = elements.itemKnowledgeStatus.value;
  elements.itemKnowledgeStatus.innerHTML = statuses.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.label)}</option>`).join("");
  elements.itemKnowledgeStatus.value = statuses.some((entry) => entry.id === currentStatus) ? currentStatus : "review";
  setSelectOptions(elements.knowledgeStatusFilter, statuses, "全部状态");
  setSelectOptions(elements.knowledgeProjectFilter, metadataValues("project", "projects"), "全部关联项");
  setSelectOptions(elements.knowledgeTagFilter, metadataValues("tags", "tags"), "全部标签");
  setSelectOptions(elements.knowledgePeopleFilter, metadataValues("people", "people"), "全部人物");
}

function renderKnowledgeMetadataManager() {
  const metadata = loadKnowledgeMetadata();
  const disabledTypes = new Set(metadata.disabledTypes);
  const disabledStatuses = new Set(metadata.disabledStatuses);
  const renderDefinitions = (kind, baseLabels, customEntries, disabled) => [...Object.entries(baseLabels).map(([id, label]) => ({ id, label, custom: false })), ...customEntries.map((entry) => ({ ...entry, custom: true }))]
    .map((entry) => `<span class="metadata-chip ${disabled.has(entry.id) ? "disabled" : ""}"><span>${escapeHtml(entry.label)}</span><button data-metadata-action="${disabled.has(entry.id) ? "restore" : "delete"}" data-metadata-kind="${kind}" data-metadata-value="${escapeHtml(entry.id)}" type="button">${disabled.has(entry.id) ? "恢复" : entry.custom ? "删除" : "停用"}</button></span>`).join("");
  const renderValues = (kind, field, catalogKey) => metadataValues(field, catalogKey).map((value) => `<span class="metadata-chip"><span>${escapeHtml(value)}</span><button data-metadata-action="delete" data-metadata-kind="${kind}" data-metadata-value="${escapeHtml(value)}" type="button">删除</button></span>`).join("") || '<span class="metadata-empty">暂无选项</span>';
  const groups = [
    ["type", "知识类型", "例如：工具说明", renderDefinitions("type", knowledgeTypeLabels, metadata.customTypes, disabledTypes)],
    ["project", "关联项", "例如：项目A、摄影", renderValues("project", "project", "projects")],
    ["tag", "标签", "例如：决策、方法", renderValues("tag", "tags", "tags")],
    ["person", "关联人物", "例如：方鹏", renderValues("person", "people", "people")],
    ["status", "知识状态", "例如：需更新", renderDefinitions("status", knowledgeStatusLabels, metadata.customStatuses, disabledStatuses)],
  ];
  elements.knowledgeManagerContent.innerHTML = groups.map(([kind, title, placeholder, content], index) => `
    <details class="metadata-group" ${index === 0 ? "open" : ""}>
      <summary><strong>${title}</strong><span>点击展开管理</span></summary>
      <form class="metadata-add-form" data-metadata-add="${kind}"><input name="metadataValue" placeholder="${placeholder}" required /><button class="button primary" type="submit">新增</button></form>
      <div class="metadata-chip-list">${content}</div>
    </details>
  `).join("");
}

function removeMetadataValue(field, value) {
  state.items.forEach((item) => {
    if (item.category !== "knowledge") return;
    item[field] = normalizeList(item[field]).split(", ").filter((entry) => entry && entry.toLowerCase() !== value.toLowerCase()).join(", ");
  });
}

function renderKnowledgeSuggestions() {
  const knowledgeItems = state.items.filter((item) => item.category === "knowledge");
  const metadata = loadKnowledgeMetadata();
  const collect = (field, catalogKey) => [...new Set([...(metadata[catalogKey] || []), ...knowledgeItems.flatMap((item) => normalizeList(item[field]).split(", ")).filter(Boolean)])].sort();
  const renderOptions = (values) => values.map((value) => `<option value="${escapeHtml(value)}"></option>`).join("");
  elements.tagSuggestions.innerHTML = renderOptions(collect("tags", "tags"));
  elements.projectSuggestions.innerHTML = renderOptions(collect("project", "projects"));
  elements.peopleSuggestions.innerHTML = renderOptions(collect("people", "people"));
}

function inferKnowledgeMetadata(title, body, currentItemId = "") {
  const text = `${title || ""} ${body || ""}`.trim();
  if (!text) return [];
  const lowerText = text.toLowerCase();
  const suggestions = [];
  const add = (kind, value, label = value) => {
    if (value && !suggestions.some((entry) => entry.kind === kind && entry.value.toLowerCase() === value.toLowerCase())) suggestions.push({ kind, value, label });
  };
  const typeRules = [
    ["person", /人物|作者|同事|朋友|室友|客户|负责人|备注/],
    ["decision", /决定|决策|结论|选择|确定|方案/],
    ["method", /方法|步骤|流程|教程|经验|技巧|怎么做/],
    ["project-memory", /项目|进度|交付|上线|需求|版本/],
    ["concept", /概念|原理|定义|机制|为什么/],
    ["source-summary", /资料|摘要|会议|视频|文章|记录/],
  ];
  const matchedType = typeRules.find(([, pattern]) => pattern.test(text));
  if (matchedType) add("type", matchedType[0], knowledgeTypeLabels[matchedType[0]]);

  const knowledgeItems = state.items.filter((item) => item.category === "knowledge" && item.id !== currentItemId);
  [["tag", "tags"], ["project", "project"], ["person", "people"]].forEach(([kind, field]) => {
    const values = [...new Set(knowledgeItems.flatMap((item) => normalizeList(item[field]).split(", ")).filter(Boolean))];
    values.filter((value) => lowerText.includes(value.toLowerCase())).slice(0, 5).forEach((value) => add(kind, value));
  });
  [...text.matchAll(/项目\s*[A-Za-z0-9_-]{1,12}/g)].slice(0, 3).forEach((match) => add("project", match[0].replace(/\s+/g, "")));
  ["AI", "知识库", "工作台", "电商", "摄影", "写作", "决策", "流程", "方法", "经验"].filter((tag) => lowerText.includes(tag.toLowerCase())).forEach((tag) => add("tag", tag));
  if (matchedType?.[0] === "person" && title?.trim()) add("person", title.trim().replace(/[（(].*$/, "").trim());
  return suggestions;
}

function renderInferredKnowledgeSuggestions() {
  const item = state.items.find((entry) => entry.id === state.selectedId);
  if (!item || item.category !== "knowledge") return;
  const suggestions = inferKnowledgeMetadata(elements.itemTitle.value, elements.itemBody.value, item.id).filter((suggestion) => {
    if (suggestion.kind === "type") return elements.itemKnowledgeType.value !== suggestion.value;
    const field = suggestion.kind === "tag" ? elements.itemTags : suggestion.kind === "project" ? elements.itemProject : elements.itemPeople;
    return !normalizeList(field.value).toLowerCase().split(", ").includes(suggestion.value.toLowerCase());
  });
  const labels = { type: "类型", tag: "标签", project: "项目", person: "人物" };
  elements.knowledgeSuggestionList.innerHTML = suggestions.length
    ? suggestions.map((suggestion) => `<button type="button" data-suggestion-kind="${suggestion.kind}" data-suggestion-value="${escapeHtml(suggestion.value)}"><span>${labels[suggestion.kind]}</span>${escapeHtml(suggestion.label)}</button>`).join("")
    : '<span class="knowledge-suggestion-empty">暂未识别出新建议，可补充正文后重新识别。</span>';
}

function renderKnowledgeLinks(item) {
  const isKnowledge = item?.category === "knowledge";
  elements.knowledgeLinks.hidden = !isKnowledge;
  if (!isKnowledge) return;
  const currentTags = normalizeList(item.tags).toLowerCase().split(", ").filter(Boolean);
  const related = state.items.filter((candidate) => {
    if (candidate.category !== "knowledge" || candidate.id === item.id) return false;
    const candidateTags = normalizeList(candidate.tags).toLowerCase().split(", ").filter(Boolean);
    const sharedTag = currentTags.some((tag) => candidateTags.includes(tag));
    const sharedProject = item.project && candidate.project && item.project.toLowerCase() === candidate.project.toLowerCase();
    const sharedPerson = item.people && candidate.people && item.people.toLowerCase() === candidate.people.toLowerCase();
    return sharedTag || sharedProject || sharedPerson;
  }).slice(0, 8);
  elements.knowledgeLinksList.innerHTML = related.length
    ? related.map((candidate) => `<button class="knowledge-link" data-knowledge-link="${candidate.id}" type="button"><strong>${escapeHtml(candidate.title)}</strong><span>${escapeHtml(knowledgeStatusLabel(candidate.knowledgeStatus))}</span></button>`).join("")
    : '<span class="knowledge-links-empty">填写相同的标签、项目或人物后，这里会显示相关知识。</span>';
}

function renderKnowledgeGraph() {
  const isKnowledge = state.category === "knowledge";
  elements.knowledgeGraph.hidden = !isKnowledge;
  if (!isKnowledge) {
    if (graphRuntime) cancelAnimationFrame(graphRuntime.frame);
    graphRuntime = null;
    return;
  }
  const items = state.items.filter((item) => item.category === "knowledge");
  const nodes = [];
  const edges = [];
  const seen = new Set();
  const addNode = (id, label, kind, itemId = "") => {
    if (!seen.has(id)) { seen.add(id); nodes.push({ id, label, kind, itemId }); }
  };
  items.forEach((item) => {
    addNode(`item:${item.id}`, item.title || "未命名内容", "knowledge", item.id);
    const fields = [["项目", item.project, "project"], ["人物", item.people, "person"], ["标签", item.tags, "tag"]];
    fields.forEach(([prefix, value, kind]) => normalizeList(value).split(", ").filter(Boolean).forEach((entry) => {
      const nodeId = `${kind}:${entry.toLowerCase()}`;
      addNode(nodeId, entry, kind);
      edges.push([`item:${item.id}`, nodeId]);
    }));
  });
  if (!nodes.length) {
    elements.knowledgeGraphCanvas.innerHTML = '<span class="graph-empty">新增知识并填写项目、人物或标签后，这里会形成关系星图。</span>';
    return;
  }
  elements.knowledgeGraphCanvas.innerHTML = '<canvas class="knowledge-star-canvas" aria-label="知识关系星图"></canvas>';
  initializeKnowledgeGraph(elements.knowledgeGraphCanvas.querySelector("canvas"), nodes, edges);
}

function initializeKnowledgeGraph(canvas, nodes, edges) {
  if (graphRuntime) cancelAnimationFrame(graphRuntime.frame);
  const context = canvas.getContext("2d");
  const colors = { knowledge: "#f0f4ff", project: "#55d7a7", person: "#ff79c8", tag: "#9e8cff" };
  const byId = new Map();
  nodes.forEach((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
    const radius = 70 + (index % 5) * 24;
    Object.assign(node, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, velocityX: 0, velocityY: 0, radius: node.kind === "knowledge" ? 6 : 4 });
    byId.set(node.id, node);
  });
  const links = edges.map(([source, target]) => ({ source: byId.get(source), target: byId.get(target) })).filter((edge) => edge.source && edge.target);
  const view = { width: 0, height: 0, scale: 1, offsetX: 0, offsetY: 0, hovered: null, dragged: null, pointerX: 0, pointerY: 0, frame: 0 };
  graphRuntime = view;

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    view.width = canvas.clientWidth;
    view.height = canvas.clientHeight;
    canvas.width = Math.round(view.width * ratio);
    canvas.height = Math.round(view.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  resize();

  const screenPosition = (node) => ({ x: view.width / 2 + view.offsetX + node.x * view.scale, y: view.height / 2 + view.offsetY + node.y * view.scale });
  const findNode = (x, y) => nodes.findLast((node) => {
    const point = screenPosition(node);
    return Math.hypot(point.x - x, point.y - y) <= Math.max(10, node.radius * view.scale + 5);
  });
  const pointer = (event) => {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  canvas.addEventListener("pointermove", (event) => {
    const point = pointer(event);
    view.pointerX = point.x;
    view.pointerY = point.y;
    if (view.dragged) {
      view.dragged.x = (point.x - view.width / 2 - view.offsetX) / view.scale;
      view.dragged.y = (point.y - view.height / 2 - view.offsetY) / view.scale;
      view.dragged.velocityX = 0;
      view.dragged.velocityY = 0;
    }
    view.hovered = findNode(point.x, point.y) || null;
    canvas.style.cursor = view.dragged ? "grabbing" : view.hovered ? "pointer" : "grab";
  });
  canvas.addEventListener("pointerdown", (event) => {
    const point = pointer(event);
    view.dragged = findNode(point.x, point.y) || null;
    if (view.dragged) canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointerup", (event) => {
    const point = pointer(event);
    const released = findNode(point.x, point.y);
    if (released && released === view.dragged) {
      if (released.itemId) selectItem(released.itemId);
      else {
        state.search = released.label;
        elements.searchInput.value = state.search;
        renderItems();
      }
    }
    view.dragged = null;
  });
  canvas.addEventListener("pointerleave", () => { view.hovered = null; view.dragged = null; });
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    view.scale = Math.max(0.55, Math.min(2.2, view.scale * (event.deltaY > 0 ? 0.9 : 1.1)));
  }, { passive: false });

  const animate = () => {
    if (elements.knowledgeGraph.hidden || graphRuntime !== view) return;
    for (let left = 0; left < nodes.length; left += 1) {
      for (let right = left + 1; right < nodes.length; right += 1) {
        const first = nodes[left];
        const second = nodes[right];
        const deltaX = second.x - first.x;
        const deltaY = second.y - first.y;
        const distanceSquared = Math.max(deltaX * deltaX + deltaY * deltaY, 80);
        const force = 55 / distanceSquared;
        first.velocityX -= deltaX * force;
        first.velocityY -= deltaY * force;
        second.velocityX += deltaX * force;
        second.velocityY += deltaY * force;
      }
    }
    links.forEach(({ source, target }) => {
      const deltaX = target.x - source.x;
      const deltaY = target.y - source.y;
      const distance = Math.max(Math.hypot(deltaX, deltaY), 1);
      const force = (distance - 72) * 0.0009;
      source.velocityX += deltaX * force;
      source.velocityY += deltaY * force;
      target.velocityX -= deltaX * force;
      target.velocityY -= deltaY * force;
    });
    nodes.forEach((node) => {
      if (node !== view.dragged) {
        node.velocityX += -node.x * 0.00018;
        node.velocityY += -node.y * 0.00018;
        node.velocityX *= 0.92;
        node.velocityY *= 0.92;
        node.x += node.velocityX;
        node.y += node.velocityY;
      }
      const horizontalLimit = Math.max(40, (view.width / 2 - 34) / view.scale);
      const verticalLimit = Math.max(40, (view.height / 2 - 24) / view.scale);
      node.x = Math.max(-horizontalLimit, Math.min(horizontalLimit, node.x));
      node.y = Math.max(-verticalLimit, Math.min(verticalLimit, node.y));
    });

    context.clearRect(0, 0, view.width, view.height);
    const gradient = context.createRadialGradient(view.width * 0.52, view.height * 0.48, 10, view.width * 0.52, view.height * 0.48, view.width * 0.65);
    gradient.addColorStop(0, "#17273a");
    gradient.addColorStop(1, "#070b12");
    context.fillStyle = gradient;
    context.fillRect(0, 0, view.width, view.height);
    links.forEach(({ source, target }) => {
      const start = screenPosition(source);
      const end = screenPosition(target);
      const highlighted = view.hovered && (source === view.hovered || target === view.hovered);
      context.strokeStyle = highlighted ? "rgba(117, 231, 195, .72)" : "rgba(167, 185, 210, .18)";
      context.lineWidth = highlighted ? 1.3 : 0.7;
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    });
    nodes.forEach((node) => {
      const point = screenPosition(node);
      const connected = !view.hovered || node === view.hovered || links.some((link) => (link.source === view.hovered && link.target === node) || (link.target === view.hovered && link.source === node));
      const radius = (node.radius + (node === view.hovered ? 3 : 0)) * Math.max(0.8, view.scale);
      context.globalAlpha = connected ? 1 : 0.24;
      context.shadowColor = colors[node.kind];
      context.shadowBlur = node === view.hovered ? 18 : 7;
      context.fillStyle = colors[node.kind];
      context.beginPath();
      context.arc(point.x, point.y, radius, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      if (node.kind === "knowledge" || node === view.hovered) {
        context.fillStyle = "rgba(235, 241, 250, .9)";
        context.font = `${node === view.hovered ? 12 : 10}px system-ui`;
        context.fillText(node.label.slice(0, 18), point.x + radius + 5, point.y + 4);
      }
      context.globalAlpha = 1;
    });
    view.frame = requestAnimationFrame(animate);
  };
  view.frame = requestAnimationFrame(animate);
  window.setTimeout(resize, 0);
}

function buildKnowledgeContext() {
  const statusOrder = { confirmed: 0, review: 1, outdated: 2 };
  const items = state.items.filter((item) => item.category === "knowledge" && normalizeKnowledgeStatus(item.knowledgeStatus) !== "outdated")
    .sort((a, b) => statusOrder[normalizeKnowledgeStatus(a.knowledgeStatus)] - statusOrder[normalizeKnowledgeStatus(b.knowledgeStatus)]);
  const sections = items.map((item, index) => [
    `## ${String(index + 1).padStart(2, "0")} ${item.title || "未命名知识"}`,
    `- 类型：${knowledgeTypeLabel(item.knowledgeType)}`,
    `- 状态：${knowledgeStatusLabel(item.knowledgeStatus)}`,
    item.project ? `- 关联项目：${item.project}` : "",
    item.people ? `- 关联人物：${item.people}` : "",
    item.tags ? `- 标签：${item.tags}` : "",
    "",
    item.body || "暂无正文",
  ].filter(Boolean).join("\n"));
  return [`# 04 个人知识库｜AI 背景包`, ``, `生成日期：${today()}`, `说明：优先采用“已确认”知识，“待验证”内容需要核实；“已过时”内容已排除。`, ``, ...sections].join("\n");
}

function renderItems() {
  const statusOrder = { confirmed: 0, review: 1, outdated: 2 };
  const items = visibleItems().sort((a, b) => {
    if (state.category !== "knowledge") return 0;
    return statusOrder[normalizeKnowledgeStatus(a.knowledgeStatus)] - statusOrder[normalizeKnowledgeStatus(b.knowledgeStatus)];
  });
  if (state.category === "knowledge") {
    const knowledgeItems = state.items.filter((item) => item.category === "knowledge");
    const count = (status) => knowledgeItems.filter((item) => normalizeKnowledgeStatus(item.knowledgeStatus) === status).length;
    elements.knowledgeSummary.innerHTML = `<span class="confirmed">已确认 ${count("confirmed")}</span><span class="review">待验证 ${count("review")}</span><span class="outdated">已过时 ${count("outdated")}</span>`;
  }
  elements.itemList.innerHTML = items.map((item) => `
    <button class="item-card ${item.id === state.selectedId ? "selected" : ""}" data-id="${item.id}" type="button">
      <span class="item-card-main">
        <span class="item-title">${escapeHtml(item.title)}</span>
        ${item.category === "knowledge" ? `<span class="knowledge-card-meta"><span>${escapeHtml(knowledgeTypeLabel(item.knowledgeType))}</span><span class="knowledge-state ${normalizeKnowledgeStatus(item.knowledgeStatus)}">${escapeHtml(knowledgeStatusLabel(item.knowledgeStatus))}</span>${item.tags ? `<span># ${escapeHtml(item.tags)}</span>` : ""}</span>` : ""}
        <span class="item-preview">${escapeHtml(item.body || "暂无详细内容")}</span>
      </span>
      <span class="item-meta">
        <span class="status ${item.status}">${item.status === "done" ? "已完成" : "进行中"}</span>
        <time>${item.date || "未设日期"}</time>
      </span>
    </button>
  `).join("");
  elements.emptyState.hidden = items.length > 0;
  elements.weeklyCount.textContent = `${state.items.filter((item) => item.status === "active").length} 项待处理`;
}

function renderCategory() {
  const category = allCategories().find((entry) => entry.id === state.category);
  elements.categoryEyebrow.textContent = category.eyebrow;
  elements.categoryTitle.textContent = category.title;
  elements.categoryDescription.textContent = category.description;
  document.body.classList.toggle("settings-view", state.category === SETTINGS_CATEGORY);
  elements.knowledgeFilters.hidden = state.category !== "knowledge";
  elements.knowledgeSummary.hidden = state.category !== "knowledge";
  elements.taskFilters.classList.toggle("knowledge-task-filter", state.category === "knowledge");
  renderKnowledgeTypeOptions();
  renderKnowledgeGraph();
  renderNav();
  renderItems();
}

function renderDetail() {
  if (state.category === SETTINGS_CATEGORY) {
    elements.detailEmpty.hidden = true;
    elements.detailForm.hidden = true;
    elements.settingsPanel.hidden = false;
    elements.detailPanel.classList.remove("open");
    renderSettings();
    return;
  }
  elements.settingsPanel.hidden = true;
  const item = state.items.find((entry) => entry.id === state.selectedId);
  elements.detailEmpty.hidden = Boolean(item);
  elements.detailForm.hidden = !item;
  elements.detailPanel.classList.toggle("open", Boolean(item));
  if (!item) return;
  const category = allCategories().find((entry) => entry.id === item.category);
  elements.detailCategory.textContent = category.title;
  elements.itemTitle.value = item.title;
  elements.itemStatus.value = item.status;
  elements.itemDate.value = item.date || "";
  elements.itemBody.value = item.body || "";
  const isKnowledge = state.category === "knowledge";
  elements.knowledgeFields.hidden = !isKnowledge;
  if (isKnowledge) renderKnowledgeSuggestions();
  elements.itemKnowledgeType.value = item.knowledgeType || "";
  elements.itemTags.value = item.tags || "";
  elements.itemProject.value = item.project || "";
  elements.itemPeople.value = item.people || "";
  elements.itemKnowledgeStatus.value = normalizeKnowledgeStatus(item.knowledgeStatus);
  if (isKnowledge) renderInferredKnowledgeSuggestions();
  renderKnowledgeLinks(item);
}

function setEditing(editing) {
  state.editing = forcedReadonly ? false : editing;
  document.body.classList.toggle("readonly", !state.editing);
  elements.modeLabel.textContent = state.editing ? "本机编辑模式" : "访客只读";
  elements.editModeButton.textContent = state.editing ? "退出编辑" : "进入编辑";
  elements.editModeButton.hidden = forcedReadonly;
  elements.shareButton.hidden = forcedReadonly;
  elements.storageNotice.textContent = forcedReadonly ? "只读预览" : "数据保存在当前浏览器";
  [elements.itemTitle, elements.itemStatus, elements.itemDate, elements.itemBody, elements.itemKnowledgeType, elements.itemTags, elements.itemProject, elements.itemPeople, elements.itemKnowledgeStatus].forEach((field) => {
    field.disabled = !state.editing;
  });
  if (state.category === "knowledge") renderKnowledgeTypeOptions();
}

function selectItem(id) {
  state.selectedId = id;
  renderItems();
  renderDetail();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

function openAccessDialog() {
  const hasKey = Boolean(localStorage.getItem(KEY_HASH_STORAGE));
  elements.accessTitle.textContent = hasKey ? "开启编辑权限" : "设置编辑密钥";
  elements.accessDescription.textContent = hasKey
    ? "输入本机编辑密钥后即可修改内容。"
    : "首次使用请设置至少 6 位的本机编辑密钥。";
  elements.accessKey.value = "";
  elements.accessError.hidden = true;
  elements.accessDialog.showModal();
  elements.accessKey.focus();
}

function openProtectedDialog(categoryId) {
  state.pendingCategory = categoryId;
  state.recoveryMode = false;
  state.resettingProtectedPassword = false;
  elements.protectedTitle.textContent = categoryId === SETTINGS_CATEGORY ? "打开工作台设置" : "打开个人文档";
  elements.protectedDescription.textContent = "该目录已加密，请输入访问密码。";
  elements.protectedPasswordLabel.hidden = false;
  elements.recoveryAnswerLabel.hidden = true;
  elements.protectedPassword.required = true;
  elements.recoveryAnswer.required = false;
  elements.newProtectedPasswordLabel.hidden = true;
  elements.newProtectedPassword.required = false;
  elements.protectedPassword.value = "";
  elements.recoveryAnswer.value = "";
  elements.protectedError.hidden = true;
  elements.recoveryToggle.textContent = "忘记密码";
  document.querySelector("#protectedForm button[type='submit']").textContent = "验证并打开";
  elements.protectedDialog.showModal();
  elements.protectedPassword.focus();
}

function enterCategory(categoryId) {
  state.category = categoryId;
  state.selectedId = null;
  renderCategory();
  renderDetail();
}

elements.categoryNav.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  const categoryId = button.dataset.category;
  const isUnlocked = sessionStorage.getItem(PROTECTED_SESSION_KEY) === "true";
  if (isEncrypted(categoryId) && !isUnlocked) {
    openProtectedDialog(categoryId);
    return;
  }
  enterCategory(categoryId);
});

elements.encryptionList.addEventListener("click", (event) => {
  const responsibilityButton = event.target.closest("[data-responsibility]");
  if (responsibilityButton) {
    const item = responsibilityButton.closest("[data-responsibility-item]");
    const detail = item.querySelector(".responsibility-detail");
    const opening = detail.hidden;
    detail.hidden = !opening;
    item.classList.toggle("open", opening);
    return;
  }
  const button = event.target.closest("[data-encryption]");
  if (!button) return;
  const configured = JSON.parse(localStorage.getItem(ENCRYPTION_STORAGE) || "{}");
  configured[button.dataset.encryption] = !isEncrypted(button.dataset.encryption);
  localStorage.setItem(ENCRYPTION_STORAGE, JSON.stringify(configured));
  void saveRemoteState();
  renderSettings(); renderNav();
});

elements.categoryAddForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const index = elements.categoryIndexInput.value.trim().padStart(2, "0");
  const title = elements.categoryTitleInput.value.trim();
  const description = elements.categoryDescriptionInput.value.trim() || "自定义工作台模块。";
  if (!/^\d{2}$/.test(index) || index === "00" || allCategories().some((category) => category.index === index)) {
    showToast("请输入未使用的两位编号");
    return;
  }
  const id = `custom-${index}-${crypto.randomUUID()}`;
  state.customCategories.push({ id, index, title, eyebrow: "自定义模块", description });
  categoryResponsibilities[id] = description;
  localStorage.setItem(CUSTOM_CATEGORIES_STORAGE, JSON.stringify(state.customCategories));
  elements.categoryAddForm.reset();
  renderSettings();
  renderNav();
  void saveRemoteState();
  showToast(`${index} ${title} 已新增`);
});

function createAvatarDataUrl(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const maxSize = 512;
      const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Invalid image"));
    };
    image.src = objectUrl;
  });
}

elements.avatarInput.addEventListener("change", async () => {
  const file = elements.avatarInput.files[0];
  if (!file) return;
  try {
    const avatar = await createAvatarDataUrl(file);
    localStorage.setItem(AVATAR_STORAGE, avatar);
    renderSettings();
    await saveRemoteState();
    showToast("头像已压缩并同步");
  } catch {
    showToast("头像处理失败，请选择 JPG、PNG 或 WebP 图片");
  }
});

elements.removeAvatar.addEventListener("click", () => { localStorage.removeItem(AVATAR_STORAGE); renderSettings(); void saveRemoteState(); showToast("已恢复默认头像"); });

elements.recoveryToggle.addEventListener("click", () => {
  state.recoveryMode = !state.recoveryMode;
  state.resettingProtectedPassword = false;
  elements.protectedPasswordLabel.hidden = state.recoveryMode;
  elements.recoveryAnswerLabel.hidden = !state.recoveryMode;
  elements.protectedPassword.required = !state.recoveryMode;
  elements.recoveryAnswer.required = state.recoveryMode;
  elements.newProtectedPasswordLabel.hidden = true;
  elements.newProtectedPassword.required = false;
  elements.protectedError.hidden = true;
  elements.protectedTitle.textContent = state.recoveryMode ? "回答验证问题" : "打开个人文档";
  elements.protectedDescription.textContent = state.recoveryMode
    ? "回答正确后，本次浏览会话将获得访问权限。"
    : "该目录已加密，请输入访问密码。";
  elements.recoveryToggle.textContent = state.recoveryMode ? "返回密码验证" : "忘记密码";
  document.querySelector("#protectedForm button[type='submit']").textContent = state.recoveryMode ? "验证问题" : "验证并打开";
  (state.recoveryMode ? elements.recoveryAnswer : elements.protectedPassword).focus();
});

elements.protectedForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.recoveryMode && !state.resettingProtectedPassword) {
    const answerHash = await hashKey(elements.recoveryAnswer.value.trim());
    if (!RECOVERY_ANSWER_HASHES.has(answerHash)) {
      elements.protectedError.textContent = "验证答案不正确，请重试。";
      elements.protectedError.hidden = false;
      return;
    }
    state.resettingProtectedPassword = true;
    elements.recoveryAnswerLabel.hidden = true;
    elements.recoveryAnswer.required = false;
    elements.newProtectedPasswordLabel.hidden = false;
    elements.newProtectedPassword.required = true;
    elements.protectedTitle.textContent = "设置新访问密码";
    elements.protectedDescription.textContent = "验证问题正确，请设置一个新的访问密码。";
    document.querySelector("#protectedForm button[type='submit']").textContent = "保存新密码";
    elements.protectedError.hidden = true;
    elements.newProtectedPassword.focus();
    return;
  }
  const value = state.resettingProtectedPassword ? elements.newProtectedPassword.value : elements.protectedPassword.value;
  const valueHash = await hashKey(value);
  const storedProtectedPassword = localStorage.getItem(PROTECTED_PASSWORD_STORAGE) || PROTECTED_PASSWORD_HASH;
  const valid = state.resettingProtectedPassword || valueHash === storedProtectedPassword;
  if (!valid) {
    elements.protectedError.hidden = false;
    return;
  }
  if (state.resettingProtectedPassword) localStorage.setItem(PROTECTED_PASSWORD_STORAGE, valueHash);
  if (!state.resettingProtectedPassword && valueHash === PROTECTED_PASSWORD_HASH) sessionStorage.setItem("workbench-write-password", value);
  void saveRemoteState();
  sessionStorage.setItem(PROTECTED_SESSION_KEY, "true");
  elements.protectedDialog.close();
  enterCategory(state.pendingCategory || PROTECTED_CATEGORY);
  state.pendingCategory = null;
  showToast("个人文档目录已解锁");
});

elements.cancelProtected.addEventListener("click", () => {
  state.pendingCategory = null;
  elements.protectedDialog.close();
});

elements.itemList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-id]");
  if (card) selectItem(card.dataset.id);
});

elements.knowledgeLinksList.addEventListener("click", (event) => {
  const link = event.target.closest("[data-knowledge-link]");
  if (link) selectItem(link.dataset.knowledgeLink);
});

let knowledgeSuggestionTimer = null;
[elements.itemTitle, elements.itemBody].forEach((field) => field.addEventListener("input", () => {
  if (state.category !== "knowledge") return;
  window.clearTimeout(knowledgeSuggestionTimer);
  knowledgeSuggestionTimer = window.setTimeout(renderInferredKnowledgeSuggestions, 500);
}));

elements.refreshKnowledgeSuggestions.addEventListener("click", renderInferredKnowledgeSuggestions);

elements.knowledgeSuggestionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-suggestion-kind]");
  if (!button) return;
  const kind = button.dataset.suggestionKind;
  const value = button.dataset.suggestionValue;
  if (kind === "type") {
    elements.itemKnowledgeType.value = value;
  } else {
    const field = kind === "tag" ? elements.itemTags : kind === "project" ? elements.itemProject : elements.itemPeople;
    field.value = normalizeList(`${field.value}, ${value}`);
  }
  renderInferredKnowledgeSuggestions();
  showToast("建议已采用，保存后生效");
});

elements.knowledgeContextButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(buildKnowledgeContext());
  showToast("AI 背景包已复制");
});

elements.searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderItems();
});

elements.knowledgeTypeFilter.addEventListener("change", (event) => {
  state.knowledgeTypeFilter = event.target.value;
  renderItems();
});

elements.knowledgeStatusFilter.addEventListener("change", (event) => {
  state.knowledgeStatusFilter = event.target.value;
  renderItems();
});

[
  [elements.knowledgeProjectFilter, "knowledgeProjectFilter"],
  [elements.knowledgeTagFilter, "knowledgeTagFilter"],
  [elements.knowledgePeopleFilter, "knowledgePeopleFilter"],
].forEach(([select, stateKey]) => select.addEventListener("change", (event) => {
  state[stateKey] = event.target.value;
  renderItems();
}));

elements.knowledgeManageButton.addEventListener("click", () => {
  if (!state.editing) return;
  renderKnowledgeMetadataManager();
  elements.knowledgeManagerDialog.showModal();
});

elements.closeKnowledgeManager.addEventListener("click", () => elements.knowledgeManagerDialog.close());

elements.knowledgeManagerContent.addEventListener("click", (event) => {
  const button = event.target.closest("[data-metadata-action]");
  if (!button) return;
  const { metadataAction: action, metadataKind: kind, metadataValue: value } = button.dataset;
  const metadata = loadKnowledgeMetadata();
  if (kind === "type" || kind === "status") {
    const disabledKey = kind === "type" ? "disabledTypes" : "disabledStatuses";
    const customKey = kind === "type" ? "customTypes" : "customStatuses";
    const label = kind === "type" ? knowledgeTypeLabel(value) : knowledgeStatusLabel(value);
    const isCustom = metadata[customKey].some((entry) => entry.id === value);
    if (action === "restore") metadata[disabledKey] = metadata[disabledKey].filter((entry) => entry !== value);
    else {
      if (!window.confirm(`${isCustom ? "删除" : "停用"}“${label}”并清空已有引用吗？`)) return;
      if (isCustom) metadata[customKey] = metadata[customKey].filter((entry) => entry.id !== value);
      else if (!metadata[disabledKey].includes(value)) metadata[disabledKey].push(value);
      state.items.forEach((item) => {
        if (item.category !== "knowledge") return;
        if (kind === "type" && item.knowledgeType === value) item.knowledgeType = "";
        if (kind === "status" && normalizeKnowledgeStatus(item.knowledgeStatus) === value) item.knowledgeStatus = "review";
      });
    }
  } else {
    if (!window.confirm(`从全部知识中删除“${value}”吗？`)) return;
    const field = kind === "tag" ? "tags" : kind === "project" ? "project" : "people";
    const catalogKey = kind === "tag" ? "tags" : kind === "project" ? "projects" : "people";
    metadata[catalogKey] = metadata[catalogKey].filter((entry) => entry.toLowerCase() !== value.toLowerCase());
    removeMetadataValue(field, value);
  }
  localStorage.setItem(KNOWLEDGE_METADATA_STORAGE, JSON.stringify(metadata));
  saveItems();
  renderKnowledgeTypeOptions();
  renderKnowledgeMetadataManager();
  renderItems();
  renderKnowledgeGraph();
  renderDetail();
  showToast("知识字段已更新");
});

elements.knowledgeManagerContent.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-metadata-add]");
  if (!form) return;
  event.preventDefault();
  const kind = form.dataset.metadataAdd;
  const value = new FormData(form).get("metadataValue").trim();
  if (!value) return;
  const metadata = loadKnowledgeMetadata();
  if (kind === "type" || kind === "status") {
    const customKey = kind === "type" ? "customTypes" : "customStatuses";
    const baseLabels = kind === "type" ? Object.values(knowledgeTypeLabels) : Object.values(knowledgeStatusLabels);
    const existing = [...baseLabels, ...metadata[customKey].map((entry) => entry.label)].some((label) => label.toLowerCase() === value.toLowerCase());
    if (existing) { showToast("该选项已存在"); return; }
    metadata[customKey].push({ id: `custom-${kind}-${crypto.randomUUID()}`, label: value });
  } else {
    const catalogKey = kind === "tag" ? "tags" : kind === "project" ? "projects" : "people";
    if (!metadata[catalogKey].some((entry) => entry.toLowerCase() === value.toLowerCase())) metadata[catalogKey].push(value);
  }
  localStorage.setItem(KNOWLEDGE_METADATA_STORAGE, JSON.stringify(metadata));
  void saveRemoteState();
  renderKnowledgeTypeOptions();
  renderKnowledgeMetadataManager();
  showToast("新选项已增加");
});

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".segment").forEach((entry) => entry.classList.remove("active"));
    button.classList.add("active");
    state.filter = button.dataset.filter;
    renderItems();
  });
});

elements.newItemButton.addEventListener("click", () => {
  const item = { id: crypto.randomUUID(), category: state.category, title: "未命名内容", body: "", status: "active", date: today() };
  state.items.unshift(item);
  saveItems();
  if (state.category === "knowledge") renderKnowledgeGraph();
  selectItem(item.id);
  elements.itemTitle.focus();
  elements.itemTitle.select();
});

elements.detailForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!state.editing) return;
  const item = state.items.find((entry) => entry.id === state.selectedId);
  if (!item) return;
  item.title = elements.itemTitle.value.trim() || "未命名内容";
  item.status = elements.itemStatus.value;
  item.date = elements.itemDate.value;
  item.body = elements.itemBody.value.trim();
  if (item.category === "knowledge") {
    item.knowledgeType = elements.itemKnowledgeType.value;
    item.tags = normalizeList(elements.itemTags.value);
    item.project = normalizeList(elements.itemProject.value);
    item.people = normalizeList(elements.itemPeople.value);
    item.knowledgeStatus = elements.itemKnowledgeStatus.value;
  }
  saveItems();
  renderItems();
  if (item.category === "knowledge") renderKnowledgeTypeOptions();
  if (item.category === "knowledge") renderKnowledgeGraph();
  showToast("内容已保存");
});

elements.deleteButton.addEventListener("click", () => {
  if (!state.editing || !state.selectedId) return;
  if (!window.confirm("确定删除这条内容吗？")) return;
  state.items = state.items.filter((item) => item.id !== state.selectedId);
  state.selectedId = null;
  saveItems();
  renderItems();
  if (state.category === "knowledge") renderKnowledgeGraph();
  renderDetail();
  showToast("内容已删除");
});

elements.editModeButton.addEventListener("click", () => {
  if (forcedReadonly) return;
  if (state.editing) {
    setEditing(false);
    showToast("已切换为只读模式");
    return;
  }
  openAccessDialog();
});

elements.accessForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const enteredHash = await hashKey(elements.accessKey.value);
  const storedHash = localStorage.getItem(KEY_HASH_STORAGE);
  if (!storedHash) {
    localStorage.setItem(KEY_HASH_STORAGE, enteredHash);
  } else if (storedHash !== enteredHash && enteredHash !== PROTECTED_PASSWORD_HASH) {
    elements.accessError.hidden = false;
    return;
  } else if (enteredHash === PROTECTED_PASSWORD_HASH) {
    localStorage.setItem(KEY_HASH_STORAGE, enteredHash);
  }
  elements.accessDialog.close();
  activeEditorPassword = elements.accessKey.value;
  setEditing(true);
  showToast("编辑模式已开启");
});

elements.cancelAccess.addEventListener("click", () => elements.accessDialog.close());

elements.shareButton.addEventListener("click", async () => {
  const url = new URL(window.location.href);
  url.searchParams.set("view", "readonly");
  try {
    await navigator.clipboard.writeText(url.href);
    showToast("只读链接已复制");
  } catch {
    window.prompt("复制这个只读链接：", url.href);
  }
});

renderCategory();
renderDetail();
setEditing(false);
void loadRemoteState();
