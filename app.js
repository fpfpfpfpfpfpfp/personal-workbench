const STORAGE_KEY = "personal-workbench-data-v1";
const KEY_HASH_STORAGE = "personal-workbench-key-v1";
const forcedReadonly = new URLSearchParams(window.location.search).get("view") === "readonly";
const PROTECTED_CATEGORY = "life";
const SETTINGS_CATEGORY = "settings";
const ENCRYPTION_STORAGE = "personal-workbench-encryption-v1";
const AVATAR_STORAGE = "personal-workbench-avatar-v1";
const CUSTOM_CATEGORIES_STORAGE = "personal-workbench-custom-categories-v1";
const PROTECTED_SESSION_KEY = "personal-workbench-life-unlocked";
const PROTECTED_PASSWORD_STORAGE = "personal-workbench-life-password-v1";
const PROTECTED_PASSWORD_HASH = "8d23cf6c86e834a7aa6eded54c26ce2bb2e74903538c61bdd5d2197997ab2f72";
const RECOVERY_ANSWER_HASHES = new Set([
  "3c7623c7d5356328d1a96257f2f8697d75bfa2276f180df58e953e776606c81e",
  "049addc4df03dffa0d484875977105f4c913b86563fbe28c9407766691ea4bdc",
]);
const remoteConfig = window.WORKBENCH_REMOTE || {};
let activeEditorPassword = null;

const knowledgeTypeLabels = {
  "project-memory": "项目记忆", person: "人物信息", concept: "概念与原理",
  method: "方法与经验", decision: "决策记录", "source-summary": "资料摘要",
};
const knowledgeStatusLabels = { inbox: "待整理", current: "当前结论", draft: "历史草稿", question: "待确认问题" };

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
  knowledgeStatusFilter: "all",
  editing: false,
  pendingCategory: null,
  recoveryMode: false,
  resettingProtectedPassword: false,
  items: loadItems(),
  customCategories: loadCustomCategories(),
};

const elements = Object.fromEntries([
  "categoryNav", "categoryEyebrow", "categoryTitle", "categoryDescription", "itemList", "emptyState",
  "detailPanel", "detailEmpty", "detailForm", "detailCategory", "itemTitle", "itemStatus", "itemDate",
  "itemBody", "knowledgeFields", "itemKnowledgeType", "itemTags", "itemProject", "itemPeople", "itemKnowledgeStatus", "knowledgeFilters", "knowledgeTypeFilter", "knowledgeStatusFilter", "newItemButton", "deleteButton", "searchInput", "editModeButton", "modeLabel", "shareButton",
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
    const filterMatch = state.filter === "all" || item.status === state.filter;
    const searchable = `${item.title} ${item.body} ${item.tags || ""} ${item.project || ""} ${item.people || ""}`.toLowerCase();
    const searchMatch = !query || searchable.includes(query);
    const typeMatch = state.category !== "knowledge" || state.knowledgeTypeFilter === "all" || item.knowledgeType === state.knowledgeTypeFilter;
    const knowledgeStatusMatch = state.category !== "knowledge" || state.knowledgeStatusFilter === "all" || (item.knowledgeStatus || "inbox") === state.knowledgeStatusFilter;
    return categoryMatch && filterMatch && searchMatch && typeMatch && knowledgeStatusMatch;
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

function renderItems() {
  const items = visibleItems();
  elements.itemList.innerHTML = items.map((item) => `
    <button class="item-card ${item.id === state.selectedId ? "selected" : ""}" data-id="${item.id}" type="button">
      <span class="item-card-main">
        <span class="item-title">${escapeHtml(item.title)}</span>
        ${item.category === "knowledge" ? `<span class="knowledge-card-meta"><span>${escapeHtml(knowledgeTypeLabels[item.knowledgeType] || "待分类")}</span><span>${escapeHtml(knowledgeStatusLabels[item.knowledgeStatus || "inbox"])}</span>${item.tags ? `<span># ${escapeHtml(item.tags)}</span>` : ""}</span>` : ""}
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
  elements.itemKnowledgeType.value = item.knowledgeType || "";
  elements.itemTags.value = item.tags || "";
  elements.itemProject.value = item.project || "";
  elements.itemPeople.value = item.people || "";
  elements.itemKnowledgeStatus.value = item.knowledgeStatus || "inbox";
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
    item.tags = elements.itemTags.value.trim();
    item.project = elements.itemProject.value.trim();
    item.people = elements.itemPeople.value.trim();
    item.knowledgeStatus = elements.itemKnowledgeStatus.value;
  }
  saveItems();
  renderItems();
  showToast("内容已保存");
});

elements.deleteButton.addEventListener("click", () => {
  if (!state.editing || !state.selectedId) return;
  if (!window.confirm("确定删除这条内容吗？")) return;
  state.items = state.items.filter((item) => item.id !== state.selectedId);
  state.selectedId = null;
  saveItems();
  renderItems();
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
