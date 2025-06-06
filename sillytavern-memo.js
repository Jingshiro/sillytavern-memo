let docContext = document;
if (window.parent && window.parent.document && window.parent.document !== document) {
  docContext = window.parent.document;
  console.log('Memo Manager: 在父文档上下文中运行。');
} else {
  console.log('Memo Manager: 在当前文档上下文中运行。');
}


const STYLE_ID = 'memo-manager-styles';
const MODAL_ID = 'memoManagerModal';
const MODAL_CLASS_NAME = 'memo-manager-modal-dialog';
const MODAL_CONTENT_CLASS = 'memo-manager-modal-content';
const MODAL_HEADER_CLASS = 'memo-manager-modal-header';
const MODAL_TITLE_CLASS = 'memo-manager-modal-title';
const MODAL_CLOSE_X_CLASS = 'memo-manager-modal-close-x';
const MODAL_BODY_CLASS = 'memo-manager-modal-body';
const MODAL_FOOTER_CLASS = 'memo-manager-modal-footer';
const MENU_BUTTON_ID = 'memoManagerMenuButton';
const MEMO_INPUT_ID = 'memoManagerMemoInput';
const MEMO_TITLE_INPUT_ID = 'memoManagerTitleInput';
const LOCAL_STORAGE_KEY_PREFIX = 'memoManager_'; // 前缀，后面跟角色-聊天记录标识


let modalElement = null;
let modalDialogElement = null;
let modalTitleElement = null;
let modalBodyElement = null;
let modalFooterElement = null;
let currentChatContext = null; // 当前聊天上下文（角色-聊天记录）
let chatChangeListener = null; // 聊天切换事件监听器
let messageObserver = null; // 消息观察器

const state = {
  memos: {}, // 存储所有备忘录数据，按聊天上下文分组
  currentView: 'list', // 'list', 'create', 'edit'
  editingMemoId: null
};


function getMemoManagerStyles() {
  return `
        @keyframes memoManagerFadeIn {
            from { opacity: 0; transform: translateY(-20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes memoItemSlideIn {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
        }

        #${MODAL_ID} {
            display: none; 
            position: fixed;
            z-index: 10000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(5px);
        }

        .${MODAL_CLASS_NAME} {
            background: var(--SmartThemeChatTintColor, #1a1a1c);
            color: var(--SmartThemeBodyColor, #e0e0e0);
            border: 1px solid var(--SmartThemeBorderColor, rgba(255, 255, 255, 0.1));
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 8px 16px rgba(0, 0, 0, 0.2);
            width: 750px;
            max-width: 95vw;
            max-height: 85vh;
            animation: memoManagerFadeIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: fixed;
            z-index: 10001;
            box-sizing: border-box;
        }

        .${MODAL_HEADER_CLASS} {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px 16px 24px;
            border-bottom: 1px solid var(--SmartThemeBorderColor, rgba(255, 255, 255, 0.1));
            flex-shrink: 0;
            background: linear-gradient(135deg, var(--SmartThemeQuoteColor, #4a9eff) 0%, transparent 100%);
            background-size: 100% 2px;
            background-repeat: no-repeat;
            background-position: bottom;
        }

        .${MODAL_TITLE_CLASS} {
            margin: 0;
            font-weight: 600;
            font-size: 20px;
            color: var(--SmartThemeBodyColor, #ffffff);
            letter-spacing: 0.5px;
        }

        .${MODAL_CLOSE_X_CLASS} {
            background: transparent;
            border: none;
            color: var(--SmartThemeBodyColor, #aaa);
            font-size: 24px;
            font-weight: 300;
            cursor: pointer;
            padding: 8px;
            line-height: 1;
            transition: all 0.2s ease;
            border-radius: 6px;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .${MODAL_CLOSE_X_CLASS}:hover {
            color: var(--SmartThemeBodyColor, #fff);
            background: rgba(255, 255, 255, 0.1);
            transform: scale(1.1);
        }

        .${MODAL_BODY_CLASS} {
            padding: 24px;
            overflow-y: auto;
            flex-grow: 1;
            text-align: left;
            box-sizing: border-box;
            min-height: 0;
        }

        .${MODAL_FOOTER_CLASS} {
            padding: 16px 24px 20px 24px;
            border-top: 1px solid var(--SmartThemeBorderColor, rgba(255, 255, 255, 0.1));
            display: flex;
            justify-content: center;
            gap: 12px;
            flex-shrink: 0;
            background: var(--SmartThemeChatTintColor, rgba(255, 255, 255, 0.02));
        }

        .memo-manager-button {
            background: var(--SmartThemeQuoteColor, #4a9eff);
            color: var(--SmartThemeBodyColor, #ffffff);
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(74, 158, 255, 0.2);
            letter-spacing: 0.3px;
        }
        .memo-manager-button:hover {
            background: var(--SmartThemeQuoteColor, #3d8bff);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
        }
        .memo-manager-button:active {
            transform: translateY(0);
        }
        .memo-manager-button.danger {
            background: #ff4757;
            box-shadow: 0 2px 8px rgba(255, 71, 87, 0.2);
        }
        .memo-manager-button.danger:hover {
            background: #ff3742;
            box-shadow: 0 4px 12px rgba(255, 71, 87, 0.3);
        }
        .memo-manager-button.primary {
            background: var(--SmartThemeQuoteColor, #4a9eff);
            box-shadow: 0 2px 8px rgba(74, 158, 255, 0.2);
        }
        .memo-manager-button.primary:hover {
            background: var(--SmartThemeQuoteColor, #3d8bff);
            box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
        }
        .memo-manager-button.secondary {
            background: var(--SmartThemeBorderColor, rgba(255, 255, 255, 0.1));
            color: var(--SmartThemeBodyColor, #e0e0e0);
            box-shadow: none;
        }
        .memo-manager-button.secondary:hover {
            background: rgba(255, 255, 255, 0.15);
            box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
        }

        .memo-list-container {
            max-height: 450px;
            overflow-y: auto;
            margin-top: 16px;
            padding-right: 4px;
        }

        .memo-list-container::-webkit-scrollbar {
            width: 6px;
        }

        .memo-list-container::-webkit-scrollbar-track {
            background: transparent;
        }

        .memo-list-container::-webkit-scrollbar-thumb {
            background: var(--SmartThemeQuoteColor, rgba(74, 158, 255, 0.3));
            border-radius: 3px;
        }

        .memo-list-container::-webkit-scrollbar-thumb:hover {
            background: var(--SmartThemeQuoteColor, rgba(74, 158, 255, 0.5));
        }

        .memo-item {
            background: var(--SmartThemeChatTintColor, rgba(255, 255, 255, 0.05));
            border: 1px solid var(--SmartThemeBorderColor, rgba(255, 255, 255, 0.1));
            border-radius: 12px;
            padding: 6px 8px;
            margin-bottom: 6px;
            transition: all 0.3s ease;
            animation: memoItemSlideIn 0.3s ease-out;
            position: relative;
            overflow: hidden;
            cursor: pointer;
        }

        .memo-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: var(--SmartThemeQuoteColor, #4a9eff);
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .memo-item:hover {
            background: var(--SmartThemeChatTintColor, rgba(255, 255, 255, 0.08));
            border-color: var(--SmartThemeQuoteColor, rgba(74, 158, 255, 0.3));
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        .memo-item:hover::before {
            opacity: 1;
        }

        .memo-item:active {
            transform: translateY(0);
        }

        .memo-item-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 4px;
            gap: 8px;
        }

        .memo-item-title {
            font-weight: 600;
            font-size: 14px;
            color: var(--SmartThemeBodyColor, #ffffff);
            margin: 0;
            line-height: 1.3;
            flex: 1;
        }

        .memo-item-date {
            font-size: 10px;
            color: var(--SmartThemeBodyColor, rgba(255, 255, 255, 0.6));
            background: var(--SmartThemeChatTintColor, rgba(255, 255, 255, 0.05));
            padding: 3px 6px;
            border-radius: 4px;
            white-space: nowrap;
            font-weight: 500;
        }

        .memo-item-content {
            color: var(--SmartThemeBodyColor, rgba(255, 255, 255, 0.85));
            line-height: 1.4;
            margin-bottom: 6px;
            font-size: 12px;
            white-space: pre-line;
            word-wrap: break-word;
            word-break: break-word;
        }

        .memo-item-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 4px;
        }

        .memo-action-button {
            background: var(--SmartThemeQuoteColor, #4a9eff);
            color: var(--SmartThemeBodyColor, #ffffff);
            border: none;
            padding: 4px 8px;
            font-size: 11px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease;
            font-weight: 500;
            box-shadow: 0 2px 6px rgba(74, 158, 255, 0.2);
        }
        .memo-action-button:hover {
            background: var(--SmartThemeQuoteColor, #3d8bff);
            transform: translateY(-1px);
            box-shadow: 0 4px 10px rgba(74, 158, 255, 0.3);
        }
        .memo-action-button.delete {
            background: #ff4757;
            color: var(--SmartThemeBodyColor, #ffffff);
            border: none;
            box-shadow: 0 2px 6px rgba(255, 71, 87, 0.2);
        }
        .memo-action-button.delete:hover {
            background: #ff3742;
            box-shadow: 0 4px 10px rgba(255, 71, 87, 0.3);
        }
        .memo-action-button.primary {
            background: var(--SmartThemeQuoteColor, #4a9eff);
            color: var(--SmartThemeBodyColor, #ffffff);
            box-shadow: 0 2px 6px rgba(74, 158, 255, 0.2);
        }
        .memo-action-button.primary:hover {
            background: var(--SmartThemeQuoteColor, #3d8bff);
            box-shadow: 0 4px 10px rgba(74, 158, 255, 0.3);
        }

        .memo-form {
            display: flex;
            flex-direction: column;
            gap: 20px;
            margin-top: 20px;
        }

        .memo-form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .memo-form-label {
            font-weight: 600;
            color: var(--SmartThemeBodyColor, #ffffff);
            font-size: 14px;
            letter-spacing: 0.3px;
        }

        #${MEMO_TITLE_INPUT_ID} {
            padding: 12px 16px;
            border: 2px solid var(--SmartThemeBorderColor, rgba(255, 255, 255, 0.1));
            border-radius: 10px;
            background: var(--SmartThemeChatTintColor, rgba(255, 255, 255, 0.05));
            color: var(--SmartThemeBodyColor, #ffffff);
            font-size: 14px;
            transition: all 0.3s ease;
            font-weight: 500;
        }

        #${MEMO_TITLE_INPUT_ID}:focus {
            outline: none;
            border-color: var(--SmartThemeQuoteColor, #4a9eff);
            background: var(--SmartThemeChatTintColor, rgba(255, 255, 255, 0.08));
            box-shadow: 0 0 0 3px var(--SmartThemeQuoteColor, rgba(74, 158, 255, 0.2));
        }

        #${MEMO_INPUT_ID} {
            padding: 12px 16px;
            border: 2px solid var(--SmartThemeBorderColor, rgba(255, 255, 255, 0.1));
            border-radius: 10px;
            background: var(--SmartThemeChatTintColor, rgba(255, 255, 255, 0.05));
            color: var(--SmartThemeBodyColor, #ffffff);
            min-height: 140px;
            resize: vertical;
            font-family: inherit;
            font-size: 14px;
            line-height: 1.6;
            transition: all 0.3s ease;
        }

        #${MEMO_INPUT_ID}:focus {
            outline: none;
            border-color: var(--SmartThemeQuoteColor, #4a9eff);
            background: var(--SmartThemeChatTintColor, rgba(255, 255, 255, 0.08));
            box-shadow: 0 0 0 3px var(--SmartThemeQuoteColor, rgba(74, 158, 255, 0.2));
        }

        .memo-chat-info {
            background: linear-gradient(135deg, var(--SmartThemeQuoteColor, rgba(74, 158, 255, 0.1)) 0%, var(--SmartThemeChatTintColor, rgba(255, 255, 255, 0.05)) 100%);
            border: 1px solid var(--SmartThemeQuoteColor, rgba(74, 158, 255, 0.2));
            padding: 16px 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            font-size: 14px;
            color: var(--SmartThemeBodyColor, #ffffff);
            text-align: center;
            font-weight: 500;
            letter-spacing: 0.3px;
        }

        .empty-memo-message {
            text-align: center;
            color: var(--SmartThemeBodyColor, rgba(255, 255, 255, 0.6));
            padding: 60px 20px;
            font-style: italic;
            font-size: 16px;
        }

        .empty-memo-message p:first-child {
            font-size: 18px;
            margin-bottom: 8px;
            color: var(--SmartThemeBodyColor, rgba(255, 255, 255, 0.8));
        }

        /* 响应式设计 */
        @media (max-width: 768px) {
            .${MODAL_CLASS_NAME} {
                width: 95vw;
                max-height: 90vh;
                border-radius: 12px;
            }
            .${MODAL_BODY_CLASS} {
                padding: 20px 16px;
            }
            .${MODAL_FOOTER_CLASS} {
                padding: 12px 16px 16px 16px;
                flex-direction: column;
                gap: 8px;
            }
            .memo-manager-button {
                width: 100%;
                justify-content: center;
            }
            .memo-item {
                padding: 6px 8px;
            }
            .memo-item-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 4px;
                margin-bottom: 4px;
            }
            .memo-item-title {
                font-size: 13px;
            }
            .memo-item-date {
                align-self: flex-end;
            }
            .memo-item-content {
                margin-bottom: 6px;
                font-size: 11px;
            }
            .memo-item-actions {
                justify-content: center;
                gap: 8px;
                margin-top: 4px;
            }
            .memo-action-button {
                flex: 1;
                text-align: center;
                padding: 3px 6px;
                font-size: 10px;
            }
        }

        /* 段落注释按钮样式 */
        .memo-annotation-btn {
            position: absolute;
            top: -5px;
            right: 5px;
            width: 18px;
            height: 18px;
            border: none;
            border-radius: 3px;
            background: transparent;
            color: var(--SmartThemeQuoteColor, rgba(74, 158, 255, 0.6));
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            opacity: 0;
            transition: all 0.2s ease;
            z-index: 100;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: none;
            line-height: 1;
        }

        .memo-annotation-btn:hover {
            background: var(--SmartThemeQuoteColor, rgba(74, 158, 255, 0.1));
            color: var(--SmartThemeQuoteColor, rgba(74, 158, 255, 1));
            transform: scale(1.2);
            box-shadow: 0 2px 8px rgba(74, 158, 255, 0.3);
        }

        .memo-annotation-btn:active {
            background: transparent;
            color: var(--SmartThemeQuoteColor, rgba(74, 158, 255, 1));
            transform: scale(1.1);
            box-shadow: none;
        }

        .mes_text p:hover .memo-annotation-btn,
        .message_text p:hover .memo-annotation-btn,
        .mes_text div:hover .memo-annotation-btn {
            opacity: 1;
        }

        .mes_text p {
            position: relative;
        }

        .message_text p {
            position: relative;
        }

        .mes_text div {
            position: relative;
        }

        /* 移动端适配 */
        @media (max-width: 768px) {
            .memo-annotation-btn {
                opacity: 0.7;
                width: 20px;
                height: 20px;
                font-size: 12px;
                right: 8px;
            }
        }
    `;
}


function getCurrentChatContext() {
  try {
    // 获取当前聊天的实际名称
    const chatName = getCurrentChatName();
    const characterName = getCharacterName();

    // 使用 角色名-聊天名 作为上下文
    const context = `${characterName}-${chatName}`;
    return context;
  } catch (e) {
    return 'default_chat';
  }
}

function getCurrentChatName() {
  try {
    // 方法1: 从聊天文件名获取
    if (window.chat_metadata && window.chat_metadata.filename) {
      const filename = window.chat_metadata.filename.replace(/\.(jsonl?|txt)$/i, '');
      if (filename && filename !== 'undefined') {
        return filename;
      }
    }

    // 方法2: 从全局变量获取
    if (window.selected_button && window.selected_button !== 'undefined') {
      return window.selected_button;
    }

    // 方法3: 从DOM元素获取聊天标题
    const chatTitleSelectors = [
      '#chat_filename',
      '.chat-title',
      '.selected_chat',
      '[data-chat-name]',
      '.chat_select option:checked',
      '#selected_chat_pole'
    ];

    for (const selector of chatTitleSelectors) {
      const element = docContext.querySelector(selector);
      if (element) {
        const chatName = element.textContent?.trim() || element.value?.trim() || element.getAttribute('data-chat-name');
        if (chatName && chatName !== 'undefined' && chatName !== '') {
          return chatName;
        }
      }
    }

    // 方法4: 从URL参数获取
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('chat')) {
      return urlParams.get('chat');
    }

    // 默认聊天名
    return 'default_chat';
  } catch (e) {
    return 'default_chat';
  }
}

function getCharacterName() {
  try {
    // 方法1: 使用 TavernHelper
    if (window.TavernHelper && window.TavernHelper.getCharData) {
      try {
        const charData = window.TavernHelper.getCharData();
        if (charData && charData.name) {
          return charData.name;
        }
      } catch (e) {
        // TavernHelper调用失败，继续使用其他方法
      }
    }

    // 方法2: 从全局变量获取
    if (window.name2 && window.name2 !== 'undefined') {
      return window.name2;
    }

    // 方法3: 从DOM获取
    const characterNameElement = docContext.querySelector('#character_name_pole, .character_name, [data-character-name]');
    if (characterNameElement) {
      const charName = characterNameElement.textContent?.trim() || characterNameElement.getAttribute('data-character-name');
      if (charName && charName !== 'undefined') {
        return charName;
      }
    }

    // 方法4: 从URL参数获取
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('character')) {
      return urlParams.get('character');
    }

    return 'unknown_character';
  } catch (e) {
    return 'unknown_character';
  }
}

function getStorageKey(context) {
  return `${LOCAL_STORAGE_KEY_PREFIX}${context}`;
}

function saveMemosToStorage(context, memos) {
  try {
    const key = getStorageKey(context);
    localStorage.setItem(key, JSON.stringify(memos));
  } catch (e) {
    console.error('Memo Manager: 保存备忘录失败:', e);
    toastr.error('保存失败: ' + e.message);
  }
}

function loadMemosFromStorage(context) {
  try {
    const key = getStorageKey(context);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  } catch (e) {
    console.error('Memo Manager: 加载备忘录失败:', e);
    return [];
  }
}


function injectStyles() {
  if (!docContext.getElementById(STYLE_ID)) {
    const style = docContext.createElement('style');
    style.id = STYLE_ID;
    style.textContent = getMemoManagerStyles();
    docContext.head.appendChild(style);
  }
}

function ensureModalStructure() {
  if (!modalElement) {
    modalElement = docContext.createElement('div');
    modalElement.id = MODAL_ID;
    modalElement.innerHTML = `
            <div class="${MODAL_CLASS_NAME}">
                <div class="${MODAL_HEADER_CLASS}">
                    <h3 class="${MODAL_TITLE_CLASS}">备忘录管理</h3>
                    <button class="${MODAL_CLOSE_X_CLASS}">&times;</button>
                </div>
                <div class="${MODAL_BODY_CLASS}"></div>
                <div class="${MODAL_FOOTER_CLASS}"></div>
            </div>
        `;
    docContext.body.appendChild(modalElement);

    modalDialogElement = modalElement.querySelector(`.${MODAL_CLASS_NAME}`);
    modalTitleElement = modalElement.querySelector(`.${MODAL_TITLE_CLASS}`);
    modalBodyElement = modalElement.querySelector(`.${MODAL_BODY_CLASS}`);
    modalFooterElement = modalElement.querySelector(`.${MODAL_FOOTER_CLASS}`);

    // 绑定关闭按钮事件
    const closeButton = modalElement.querySelector(`.${MODAL_CLOSE_X_CLASS}`);
    if (closeButton) {
      closeButton.addEventListener('click', closeMemoModal);
    }

    // 点击背景关闭模态框
    modalElement.addEventListener('click', (e) => {
      if (e.target === modalElement) {
        closeMemoModal();
      }
    });
  }
}

function createButton(text, className, onClick) {
  const button = docContext.createElement('button');
  button.textContent = text;
  button.className = `memo-manager-button ${className || ''}`;
  button.onclick = onClick;
  return button;
}

function renderMemoList() {
  // 设置当前视图状态
  state.currentView = 'list';

  // 每次渲染时都重新获取当前聊天上下文
  const newChatContext = getCurrentChatContext();

  // 如果聊天上下文发生了变化，更新当前上下文
  if (currentChatContext !== newChatContext) {
    currentChatContext = newChatContext;
  }

  const memos = loadMemosFromStorage(currentChatContext);

  // 按最后编辑时间倒序排列（最新的在前面）
  memos.sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt);
    const timeB = new Date(b.updatedAt || b.createdAt);
    return timeB - timeA; // 倒序排列
  });

  modalTitleElement.textContent = 'Memo';

  // 显示当前聊天信息
  let characterName = 'Unknown Character';
  let chatName = 'Unknown Chat';

  if (window.TavernHelper && window.TavernHelper.substitudeMacros) {
    try {
      characterName = window.TavernHelper.substitudeMacros('{{char}}') || 'Unknown Character';
      // 尝试获取聊天名，可能的宏包括这些
      const possibleChatMacros = ['{{chatName}}', '{{chat_name}}', '{{filename}}', '{{chat}}'];
      for (const macro of possibleChatMacros) {
        const result = window.TavernHelper.substitudeMacros(macro);
        if (result && result !== macro) { // 如果宏被成功替换了
          chatName = result;
          break;
        }
      }
      // 如果上面的宏都没用，尝试传统方法
      if (chatName === 'Unknown Chat') {
        chatName = getCurrentChatName();
      }
    } catch (e) {
      characterName = getCharacterName();
      chatName = getCurrentChatName();
    }
  } else {
    // 如果没有 TavernHelper，使用传统方法
    characterName = getCharacterName();
    chatName = getCurrentChatName();
  }

  let html = `
        <div class="memo-chat-info">
            ${escapeHtml(characterName)} - ${escapeHtml(chatName)}
        </div>
    `;

  if (memos.length === 0) {
    html += `
            <div class="empty-memo-message">
                <p>暂无备忘录</p>
                <p>点击"新建备忘录"开始记录吧！</p>
            </div>
        `;
  } else {
    html += '<div class="memo-list-container">';
    memos.forEach((memo) => {
      // 为旧版本数据添加兼容性支持
      if (!memo.type) {
        memo.type = memo.originalText ? 'annotation' : 'normal';
      }
      
      // 使用 getDisplayTitle 获取显示标题
      const displayTitle = getDisplayTitle(memo);
      // 显示最后编辑时间，如果没有则显示创建时间
      const lastEditTime = memo.updatedAt || memo.createdAt;
      const date = new Date(lastEditTime).toLocaleString('zh-CN');
      
      // 生成备忘录项HTML
      html += `
                <div class="memo-item" data-memo-id="${memo.id}">
                    <div class="memo-item-header">
                        <h4 class="memo-item-title">${escapeHtml(displayTitle)}</h4>
                        <span class="memo-item-date">${date}</span>
                    </div>
                    ${memo.type === 'annotation' && memo.originalText ? `
                    <div class="memo-item-content">
                        ${escapeHtml(memo.content.length > 50 ? memo.content.substring(0, 50) + '...' : memo.content)}
                    </div>
                    ` : `
                    <div class="memo-item-content">
                        ${escapeHtml(memo.content.length > 50 ? memo.content.substring(0, 50) + '...' : memo.content)}
                    </div>
                    `}
                    <div class="memo-item-actions">
                        ${memo.type === 'annotation' && memo.originalText ? `
                        <button class="memo-action-button primary" data-memo-id="${memo.id}" data-action="share">分享</button>
                        ` : ''}
                        <button class="memo-action-button delete" data-memo-id="${memo.id}" data-action="delete">删除</button>
                    </div>
                </div>
            `;
    });
    html += '</div>';
  }

  modalBodyElement.innerHTML = html;

  // 绑定备忘录操作按钮事件
  bindMemoActionEvents();

  // 渲染底部按钮
  modalFooterElement.innerHTML = '';
  modalFooterElement.appendChild(createButton('新建备忘录', 'primary', () => renderCreateMemo()));
  modalFooterElement.appendChild(createButton('清空所有', 'danger', () => clearAllMemos()));

  // 重新居中模态框
  requestAnimationFrame(() => {
    centerModal();
  });
}

// 绑定备忘录操作按钮事件
function bindMemoActionEvents() {
  // 绑定备忘录框点击事件（进入编辑模式）
  const memoItems = modalBodyElement.querySelectorAll('.memo-item');
  memoItems.forEach(item => {
    item.addEventListener('click', (e) => {
      // 如果点击的是删除按钮，不触发编辑
      if (e.target.classList.contains('memo-action-button')) {
        return;
      }
      
      const memoId = parseInt(item.getAttribute('data-memo-id'));
      if (memoId) {
        editMemo(memoId);
      }
    });
  });
  
  // 绑定删除按钮事件
  const actionButtons = modalBodyElement.querySelectorAll('.memo-action-button');
  actionButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation(); // 阻止事件冒泡到父元素
      const memoId = parseInt(e.target.getAttribute('data-memo-id'));
      const action = e.target.getAttribute('data-action');

      if (action === 'share') {
        shareMemo(memoId);
      } else if (action === 'delete') {
        deleteMemo(memoId);
      }
    });
  });
}

function renderCreateMemo() {
  renderCreateMemoWithParagraph('');
}

function renderCreateMemoWithParagraph(paragraphText = '') {
  // 设置当前视图状态
  state.currentView = 'create';

  // 确保使用最新的聊天上下文
  currentChatContext = getCurrentChatContext();

  modalTitleElement.textContent = paragraphText ? '为段落创建备忘录' : '新建备忘录';

  const html = `
        <div class="memo-form">
            <div class="memo-form-group">
                <label class="memo-form-label" for="${MEMO_TITLE_INPUT_ID}">标题（可选）：</label>
                <input type="text" id="${MEMO_TITLE_INPUT_ID}" 
                       placeholder="留空将自动生成标题..." 
                       value="" />
            </div>
            ${paragraphText ? `
            <div class="memo-form-group">
                <label class="memo-form-label" for="memoManagerOriginalTextInput">原文段落（可编辑）：</label>
                <textarea id="memoManagerOriginalTextInput" 
                         style="padding: 12px 16px;
                                border: 2px solid var(--SmartThemeBorderColor, rgba(255, 255, 255, 0.1));
                                border-radius: 10px;
                                background: var(--SmartThemeChatTintColor, rgba(255, 255, 255, 0.05));
                                color: var(--SmartThemeBodyColor, #ffffff);
                                min-height: 100px;
                                max-height: 150px;
                                resize: vertical;
                                font-family: inherit;
                                font-size: 14px;
                                line-height: 1.6;
                                transition: all 0.3s ease;
                                width: 100%;
                                box-sizing: border-box;
                                margin-bottom: 8px;"
                         placeholder="编辑原文段落内容...">${escapeHtml(paragraphText)}</textarea>
            </div>
            ` : ''}
            <div class="memo-form-group">
                <label class="memo-form-label" for="${MEMO_INPUT_ID}">内容：</label>
                <textarea id="${MEMO_INPUT_ID}" placeholder="${paragraphText ? '请输入对此段落的注释...' : '请输入备忘录内容...'}"></textarea>
            </div>
        </div>
    `;

  modalBodyElement.innerHTML = html;

  // 为原文textarea添加focus样式
  if (paragraphText) {
    const originalTextInput = docContext.getElementById('memoManagerOriginalTextInput');
    if (originalTextInput) {
      originalTextInput.addEventListener('focus', function() {
        this.style.borderColor = 'var(--SmartThemeQuoteColor, #4a9eff)';
        this.style.background = 'var(--SmartThemeChatTintColor, rgba(255, 255, 255, 0.08))';
        this.style.boxShadow = '0 0 0 3px var(--SmartThemeQuoteColor, rgba(74, 158, 255, 0.2))';
      });
      originalTextInput.addEventListener('blur', function() {
        this.style.borderColor = 'var(--SmartThemeBorderColor, rgba(255, 255, 255, 0.1))';
        this.style.background = 'var(--SmartThemeChatTintColor, rgba(255, 255, 255, 0.05))';
        this.style.boxShadow = 'none';
      });
    }
  }

  // 渲染底部按钮
  modalFooterElement.innerHTML = '';
  modalFooterElement.appendChild(createButton('保存', 'primary', saveMemo));
  modalFooterElement.appendChild(createButton('取消', 'secondary', () => renderMemoList()));

  // 重新居中模态框
  requestAnimationFrame(() => {
    centerModal();
  });

  // 聚焦到合适的输入框
  setTimeout(() => {
    if (paragraphText) {
      // 如果是段落注释，聚焦到内容输入框
      const contentInput = docContext.getElementById(MEMO_INPUT_ID);
      if (contentInput) contentInput.focus();
    } else {
      // 如果是新建备忘录，聚焦到内容输入框（因为标题可选）
      const contentInput = docContext.getElementById(MEMO_INPUT_ID);
      if (contentInput) contentInput.focus();
    }
  }, 100);
}

function renderEditMemo(memoId) {
  // 设置当前视图状态
  state.currentView = 'edit';

  // 确保使用最新的聊天上下文
  currentChatContext = getCurrentChatContext();

  const memos = loadMemosFromStorage(currentChatContext);
  const memo = memos.find(m => m.id === memoId);

  if (!memo) {
    toastr.error('备忘录不存在！');
    renderMemoList();
    return;
  }

  // 为旧版本数据添加兼容性支持
  if (!memo.type) {
    memo.type = memo.originalText ? 'annotation' : 'normal';
  }

  modalTitleElement.textContent = '编辑备忘录';
  state.editingMemoId = memoId;

  const html = `
        <div class="memo-form">
            <div class="memo-form-group">
                <label class="memo-form-label" for="${MEMO_TITLE_INPUT_ID}">标题（可选）：</label>
                <input type="text" id="${MEMO_TITLE_INPUT_ID}" 
                       placeholder="留空将自动生成标题..." 
                       value="${escapeHtml(memo.title || '')}" />
            </div>
            ${memo.type === 'annotation' && memo.originalText ? `
            <div class="memo-form-group">
                <label class="memo-form-label" for="memoManagerOriginalTextInput">原文段落（可编辑）：</label>
                <textarea id="memoManagerOriginalTextInput" 
                         style="padding: 12px 16px;
                                border: 2px solid var(--SmartThemeBorderColor, rgba(255, 255, 255, 0.1));
                                border-radius: 10px;
                                background: var(--SmartThemeChatTintColor, rgba(255, 255, 255, 0.05));
                                color: var(--SmartThemeBodyColor, #ffffff);
                                min-height: 100px;
                                max-height: 150px;
                                resize: vertical;
                                font-family: inherit;
                                font-size: 14px;
                                line-height: 1.6;
                                transition: all 0.3s ease;
                                width: 100%;
                                box-sizing: border-box;
                                margin-bottom: 8px;"
                         placeholder="编辑原文段落内容...">${escapeHtml(memo.originalText)}</textarea>
            </div>
            ` : ''}
            <div class="memo-form-group">
                <label class="memo-form-label" for="${MEMO_INPUT_ID}">内容：</label>
                <textarea id="${MEMO_INPUT_ID}">${escapeHtml(memo.content)}</textarea>
            </div>
        </div>
    `;

  modalBodyElement.innerHTML = html;

  // 为原文textarea添加focus样式
  if (memo.type === 'annotation' && memo.originalText) {
    const originalTextInput = docContext.getElementById('memoManagerOriginalTextInput');
    if (originalTextInput) {
      originalTextInput.addEventListener('focus', function() {
        this.style.borderColor = 'var(--SmartThemeQuoteColor, #4a9eff)';
        this.style.background = 'var(--SmartThemeChatTintColor, rgba(255, 255, 255, 0.08))';
        this.style.boxShadow = '0 0 0 3px var(--SmartThemeQuoteColor, rgba(74, 158, 255, 0.2))';
      });
      originalTextInput.addEventListener('blur', function() {
        this.style.borderColor = 'var(--SmartThemeBorderColor, rgba(255, 255, 255, 0.1))';
        this.style.background = 'var(--SmartThemeChatTintColor, rgba(255, 255, 255, 0.05))';
        this.style.boxShadow = 'none';
      });
    }
  }

  // 渲染底部按钮
  modalFooterElement.innerHTML = '';
  modalFooterElement.appendChild(createButton('保存修改', 'primary', updateMemo));
  modalFooterElement.appendChild(createButton('取消', 'secondary', () => renderMemoList()));

  // 重新居中模态框
  requestAnimationFrame(() => {
    centerModal();
  });
}


function saveMemo() {
  const titleInput = docContext.getElementById(MEMO_TITLE_INPUT_ID);
  const contentInput = docContext.getElementById(MEMO_INPUT_ID);
  const originalTextInput = docContext.getElementById('memoManagerOriginalTextInput');

  if (!titleInput || !contentInput) {
    toastr.error('找不到输入框！');
    return;
  }

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const originalText = originalTextInput ? originalTextInput.value.trim() : '';

  if (!content) {
    toastr.warning('请输入备忘录内容！');
    contentInput.focus();
    return;
  }

  // 确保使用最新的聊天上下文
  currentChatContext = getCurrentChatContext();
  const memos = loadMemosFromStorage(currentChatContext);

  const newMemo = {
    id: Date.now(),
    title: title,
    content: content,
    originalText: originalText, // 保存原始段落文本
    type: originalText ? 'annotation' : 'normal', // 标记备忘录类型
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  memos.push(newMemo);
  saveMemosToStorage(currentChatContext, memos);

  toastr.success(originalText ? '段落注释已保存！' : '备忘录已保存！');
  renderMemoList();
}

function updateMemo() {
  const titleInput = docContext.getElementById(MEMO_TITLE_INPUT_ID);
  const contentInput = docContext.getElementById(MEMO_INPUT_ID);
  const originalTextInput = docContext.getElementById('memoManagerOriginalTextInput');

  if (!titleInput || !contentInput) {
    toastr.error('找不到输入框！');
    return;
  }

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const originalText = originalTextInput ? originalTextInput.value.trim() : '';

  if (!content) {
    toastr.warning('请输入备忘录内容！');
    contentInput.focus();
    return;
  }

  // 确保使用最新的聊天上下文
  currentChatContext = getCurrentChatContext();
  const memos = loadMemosFromStorage(currentChatContext);
  const memoId = state.editingMemoId;

  const memoIndex = memos.findIndex(m => m.id === memoId);
  if (memoIndex !== -1) {
    memos[memoIndex].title = title;
    memos[memoIndex].content = content;
    // 如果有原文输入框，也更新原文内容
    if (originalTextInput) {
      memos[memoIndex].originalText = originalText;
    }
    memos[memoIndex].updatedAt = new Date().toISOString();
    // 确保旧备忘录也有type字段
    if (!memos[memoIndex].type) {
      memos[memoIndex].type = (memos[memoIndex].originalText || originalText) ? 'annotation' : 'normal';
    }

    saveMemosToStorage(currentChatContext, memos);
    toastr.success('备忘录已更新！');
    renderMemoList();
  } else {
    toastr.error('备忘录不存在！');
    renderMemoList();
  }
}

function deleteMemo(memoId) {
  if (!confirm('确定要删除这条备忘录吗？')) {
    return;
  }

  // 确保使用最新的聊天上下文
  currentChatContext = getCurrentChatContext();
  const memos = loadMemosFromStorage(currentChatContext);
  const memoIndex = memos.findIndex(m => m.id === memoId);

  if (memoIndex !== -1) {
    memos.splice(memoIndex, 1);
    saveMemosToStorage(currentChatContext, memos);
    toastr.success('备忘录已删除！');
    renderMemoList();
  } else {
    toastr.error('备忘录不存在！');
  }
}

function editMemo(memoId) {
  renderEditMemo(memoId);
}

function centerModal() {
  if (!modalDialogElement) return;

  const windowWidth = window.innerWidth || docContext.documentElement.clientWidth || docContext.body.clientWidth;
  const windowHeight = window.innerHeight || docContext.documentElement.clientHeight || docContext.body.clientHeight;

  const dialogWidth = modalDialogElement.offsetWidth || 750;
  const dialogHeight = modalDialogElement.offsetHeight || 600;

  const left = Math.max(0, (windowWidth - dialogWidth) / 2);
  const top = Math.max(0, (windowHeight - dialogHeight) / 2);

  modalDialogElement.style.left = `${left}px`;
  modalDialogElement.style.top = `${top}px`;
}

function openMemoManagerModal() {
  ensureModalStructure();
  modalElement.style.display = 'block';

  // 等待一帧以确保DOM已渲染完成，然后居中显示
  requestAnimationFrame(() => {
    centerModal();
  });

  renderMemoList();

  // 监听聊天切换事件
  setupChatChangeListener();

  // 监听窗口大小变化，重新居中
  window.addEventListener('resize', centerModal);
}

function closeMemoModal() {
  if (modalElement) {
    modalElement.style.display = 'none';
  }

  // 移除聊天切换事件监听器
  removeChatChangeListener();

  // 移除窗口大小变化监听器
  window.removeEventListener('resize', centerModal);

  state.currentView = 'list';
  state.editingMemoId = null;
}

// 设置聊天切换事件监听器
function setupChatChangeListener() {
  // 移除之前的监听器（如果存在）
  removeChatChangeListener();

  // 创建事件处理函数
  chatChangeListener = function (event) {
    // 只在模态框打开且在列表视图时才自动刷新
    if (modalElement && modalElement.style.display === 'block' && state.currentView === 'list') {
      const newContext = getCurrentChatContext();
      if (currentChatContext !== newContext) {
        renderMemoList();
      }
    }
  };

  // 尝试监听多种可能的聊天切换事件
  const eventTypes = [
    'CHAT_CHANGED',
    'chat_changed',
    'chatChanged',
    'character_selected',
    'CHARACTER_SELECTED'
  ];

  eventTypes.forEach(eventType => {
    try {
      // 尝试监听 document 上的自定义事件
      docContext.addEventListener(eventType, chatChangeListener);
    } catch (e) {
      // 静默忽略注册失败
    }
  });

  // 如果存在 eventSource 或其他事件分发器，也尝试监听
  if (window.eventSource && typeof window.eventSource.addEventListener === 'function') {
    try {
      window.eventSource.addEventListener('CHAT_CHANGED', chatChangeListener);
    } catch (e) {
      // 静默忽略注册失败
    }
  }
}

// 移除聊天切换事件监听器
function removeChatChangeListener() {
  if (chatChangeListener) {
    const eventTypes = [
      'CHAT_CHANGED',
      'chat_changed',
      'chatChanged',
      'character_selected',
      'CHARACTER_SELECTED'
    ];

    eventTypes.forEach(eventType => {
      try {
        docContext.removeEventListener(eventType, chatChangeListener);
      } catch (e) {
        // 静默忽略移除失败
      }
    });

    if (window.eventSource && typeof window.eventSource.removeEventListener === 'function') {
      try {
        window.eventSource.removeEventListener('CHAT_CHANGED', chatChangeListener);
      } catch (e) {
        // 静默忽略移除失败
      }
    }

    chatChangeListener = null;
  }
}


function escapeHtml(text) {
  const div = docContext.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 生成显示用的标题
function getDisplayTitle(memo) {
  // 如果有自定义标题，直接使用
  if (memo.title && memo.title.trim()) {
    return memo.title.trim();
  }
  
  // 没有标题时，根据类型生成
  if (memo.type === 'annotation' && memo.originalText && memo.originalText.trim()) {
    // 原文注释：使用原文前5字
    const text = memo.originalText.trim();
    return text.length > 5 ? text.substring(0, 5) + '...' : text;
  } else if (memo.content && memo.content.trim()) {
    // 普通备忘录：使用内容前5字
    const text = memo.content.trim();
    return text.length > 5 ? text.substring(0, 5) + '...' : text;
  } else {
    // 兜底情况：如果连内容都没有，返回默认标题
    return '无标题备忘录';
  }
}

function createMemoMenuButton(retryCount = 0) {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 500;

  if (docContext.getElementById(MENU_BUTTON_ID)) {
    return;
  }

  const extensionsMenu = docContext.getElementById('extensions_menu') || docContext.getElementById('extensionsMenu');

  if (extensionsMenu) {
    const menuButton = docContext.createElement('div');
    menuButton.id = MENU_BUTTON_ID;
    menuButton.className = 'list-group-item flex-container flexGap5 interactable';
    menuButton.setAttribute('tabindex', '0');
    menuButton.title = '备忘录';

    const iconSpan = docContext.createElement('span');
    iconSpan.textContent = '✎';
    menuButton.appendChild(iconSpan);

    const textSpan = docContext.createElement('span');
    textSpan.textContent = 'Memo';
    menuButton.appendChild(textSpan);

    menuButton.onclick = openMemoManagerModal;
    extensionsMenu.prepend(menuButton);
  } else {
    if (retryCount < MAX_RETRIES) {
      setTimeout(() => createMemoMenuButton(retryCount + 1), RETRY_DELAY);
    }
  }
}

window.closeMemoModal = closeMemoModal;

function initializeMemoManager() {
  try {
    // 清理之前可能存在的事件监听器
    removeChatChangeListener();

    // 注入样式
    injectStyles();

    // 创建菜单按钮
    if (docContext.readyState === 'loading') {
      docContext.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          createMemoMenuButton();
          initMessageObserver(); // 初始化消息观察器
        }, 1000);
      });
    } else {
      setTimeout(() => {
        createMemoMenuButton();
        initMessageObserver(); // 初始化消息观察器
      }, 1000);
    }

    // 页面卸载时清理事件监听器
    window.addEventListener('beforeunload', () => {
      removeChatChangeListener();
      stopMessageObserver();
    });
  } catch (error) {
    console.error('Memo Manager: 初始化失败:', error);
  }
}

// 消息观察器相关函数
function initMessageObserver() {
  try {
    // 移除之前的观察器
    if (messageObserver) {
      messageObserver.disconnect();
    }

    // 查找聊天容器
    const chatContainer = docContext.querySelector('#chat') || 
                         docContext.querySelector('.chat-container') ||
                         docContext.querySelector('[id*="chat"]');
    
    if (!chatContainer) {
      console.log('Memo Manager: 未找到聊天容器，稍后重试...');
      // 5秒后重试
      setTimeout(() => initMessageObserver(), 5000);
      return;
    }

    console.log('Memo Manager: 开始监听消息变化...');

    messageObserver = new MutationObserver((mutations) => {
      let needsUpdate = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              needsUpdate = true;
            }
          });
        }
      });

      if (needsUpdate) {
        // 防抖处理，避免频繁更新
        clearTimeout(window.memoAnnotationTimeout);
        window.memoAnnotationTimeout = setTimeout(() => {
          injectParagraphButtons(chatContainer);
        }, 300);
      }
    });

    messageObserver.observe(chatContainer, {
      childList: true,
      subtree: true
    });

    // 初始化现有消息
    setTimeout(() => {
      injectParagraphButtons(chatContainer);
    }, 1000);

  } catch (error) {
    console.error('Memo Manager: 初始化消息观察器失败:', error);
  }
}

function injectParagraphButtons(container) {
  try {
    // 查找所有消息中的段落
    const selectors = [
      '.mes_text p',
      '.message_text p', 
      '.mes_text div:not(.memo-annotation-btn):not([class*="btn"]):not([class*="button"])',
      '.message_text div:not(.memo-annotation-btn):not([class*="btn"]):not([class*="button"])'
    ];

    selectors.forEach(selector => {
      const paragraphs = container.querySelectorAll(selector);
      paragraphs.forEach((paragraph, index) => {
        // 检查段落是否有足够的文本内容
        const textContent = paragraph.textContent?.trim();
        if (!textContent || textContent.length < 10) {
          return; // 跳过太短的内容
        }

        // 检查是否已经有按钮
        if (!paragraph.querySelector('.memo-annotation-btn')) {
          createAnnotationButton(paragraph, index);
        }
      });
    });

  } catch (error) {
    console.error('Memo Manager: 注入段落按钮失败:', error);
  }
}

function createAnnotationButton(paragraph, index) {
  try {
    const button = docContext.createElement('button');
    button.className = 'memo-annotation-btn';
    button.title = '为此段落创建备忘录';
    button.innerHTML = '✎';
    
    // 绑定点击事件
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const paragraphText = paragraph.textContent?.trim();
      if (paragraphText) {
        openAnnotationMemo(paragraphText);
      }
    });
    
    // 设置段落为相对定位
    paragraph.style.position = 'relative';
    
    // 添加按钮到段落
    paragraph.appendChild(button);

  } catch (error) {
    console.error('Memo Manager: 创建注释按钮失败:', error);
  }
}

function openAnnotationMemo(paragraphText) {
  try {
    // 确保模态框结构存在
    ensureModalStructure();
    
    // 显示模态框
    modalElement.style.display = 'block';
    
    // 渲染创建备忘录界面，预填充段落内容
    renderCreateMemoWithParagraph(paragraphText);
    
    // 监听聊天切换事件
    setupChatChangeListener();
    
    // 监听窗口大小变化，重新居中
    window.addEventListener('resize', centerModal);
    
    // 居中显示
    requestAnimationFrame(() => {
      centerModal();
    });

  } catch (error) {
    console.error('Memo Manager: 打开段落注释失败:', error);
    toastr.error('打开注释功能失败，请重试');
  }
}

// 停止消息观察器
function stopMessageObserver() {
  if (messageObserver) {
    messageObserver.disconnect();
    messageObserver = null;
  }
}

// 分享备忘录功能
function shareMemo(memoId) {
  try {
    // 确保使用最新的聊天上下文
    currentChatContext = getCurrentChatContext();
    const memos = loadMemosFromStorage(currentChatContext);
    const memo = memos.find(m => m.id === memoId);

    if (!memo) {
      toastr.error('备忘录不存在！');
      return;
    }

    if (memo.type !== 'annotation' || !memo.originalText) {
      toastr.error('只能分享段落注释！');
      return;
    }

    // 显示加载提示
    toastr.info('正在生成图片...');

    // 生成图片
    generateMemoImage(memo).then(imageDataUrl => {
      // 显示图片预览
      showImagePreview(imageDataUrl, memo);
      toastr.success('图片生成成功！');
    }).catch(error => {
      console.error('Memo Manager: 生成图片失败:', error);
      toastr.error('生成图片失败，请重试');
    });

  } catch (error) {
    console.error('Memo Manager: 分享备忘录失败:', error);
    toastr.error('分享功能出错，请重试');
  }
}

// 显示图片预览
function showImagePreview(imageDataUrl, memo) {
  // 设置当前视图状态
  state.currentView = 'preview';
  
  modalTitleElement.textContent = '图片预览';
  
  const html = `
    <div style="text-align: center; padding: 20px 0;">
      <div style="margin-bottom: 20px; color: var(--SmartThemeBodyColor, rgba(255, 255, 255, 0.8)); font-size: 14px;">
        ${escapeHtml(getDisplayTitle(memo))}
      </div>
      <div style="max-height: 500px; overflow: auto; border: 1px solid var(--SmartThemeBorderColor, rgba(255, 255, 255, 0.1)); border-radius: 8px; background: #fff; padding: 10px;">
        <img src="${imageDataUrl}" style="max-width: 100%; height: auto; border-radius: 4px;" alt="备忘录图片" />
      </div>
    </div>
  `;
  
  modalBodyElement.innerHTML = html;
  
  // 渲染底部按钮
  modalFooterElement.innerHTML = '';
  modalFooterElement.appendChild(createButton('下载图片', 'primary', () => downloadImage(imageDataUrl, memo)));
  modalFooterElement.appendChild(createButton('返回', 'secondary', () => renderMemoList()));
  
  // 重新居中模态框
  requestAnimationFrame(() => {
    centerModal();
  });
}

// 下载图片
function downloadImage(imageDataUrl, memo) {
  try {
    // 生成更有意义的文件名
    const displayTitle = getDisplayTitle(memo);
    const safeTitle = displayTitle.replace(/[^\w\u4e00-\u9fa5]/g, '_').substring(0, 20);
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[:\-]/g, '');
    const fileName = `memo_${safeTitle}_${timestamp}.png`;
    
    // 创建下载链接
    const link = docContext.createElement('a');
    link.href = imageDataUrl;
    link.download = fileName;
    
    // 触发下载
    docContext.body.appendChild(link);
    link.click();
    docContext.body.removeChild(link);
    
    toastr.success('图片已下载！');
  } catch (error) {
    console.error('Memo Manager: 下载图片失败:', error);
    toastr.error('下载失败，请重试');
  }
}

// 生成备忘录图片
function generateMemoImage(memo) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = docContext.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // 设置画布尺寸（类似手机屏幕比例）
      const width = 800;
      // 先计算内容所需的高度
      const estimatedHeight = calculateContentHeight(ctx, memo, width);
      const height = Math.max(250, estimatedHeight + 3); // 最小高度250px，加3px的缓冲
      
      canvas.width = width;
      canvas.height = height;
      
      // 设置画布缩放以获得更清晰的文字
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(scale, scale);
      
      // 绘制背景
      drawBackground(ctx, width, height);
      
      // 绘制内容
      drawMemoContent(ctx, memo, width, height).then(() => {
        // 返回图片数据
        resolve(canvas.toDataURL('image/png', 0.9));
      }).catch(reject);
      
    } catch (error) {
      reject(error);
    }
  });
}

// 计算内容所需的高度
function calculateContentHeight(ctx, memo, width) {
  const padding = 30;
  const contentWidth = width - padding * 2;
  let totalHeight = padding + 20; // 初始padding
  
  // 用户名和角色名
  totalHeight += 20; // 用户信息行高度
  
  // 设置字体以准确计算
  ctx.font = '12px "QiushuiShotai", serif';
  totalHeight += 15; // 时间行高度
  totalHeight += 25; // 时间到标题的间距
  
  // 计算标题高度
  if (memo.title && memo.title.trim()) {
    ctx.font = 'bold 20px "QiushuiShotai", serif';
    const titleLines = wrapText(ctx, memo.title.trim(), contentWidth);
    totalHeight += titleLines.length * 26 + 15;
  }
  
  // 装饰线
  totalHeight += 20;
  
  // "摘录"标签
  totalHeight += 18;
  
  // 计算原文高度
  ctx.font = '18px "QiushuiShotai", serif';
  const originalLines = wrapText(ctx, memo.originalText, contentWidth - 30);
  totalHeight += originalLines.length * 24 + 25; // 内容 + 引号空间 + 间距
  
  // 分隔线
  totalHeight += 20;
  
  // "笔记"标签
  totalHeight += 15;
  
  // 计算注释高度
  ctx.font = '16px "QiushuiShotai", serif';
  const contentLines = wrapText(ctx, memo.content, contentWidth);
  totalHeight += contentLines.length * 22 + 15; // 内容 + 间距（更紧凑）
  
  // 底部装饰
  totalHeight += 8; // 到底部装饰的间距
  totalHeight += 12; // 标语高度
  totalHeight += 10; // 最终底部间距
  
  return totalHeight;
}

// 绘制背景
function drawBackground(ctx, width, height) {
  // 创建温暖的渐变背景
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f8f9ff');
  gradient.addColorStop(0.3, '#f0f4ff');
  gradient.addColorStop(0.7, '#fff0f5');
  gradient.addColorStop(1, '#fff5f0');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // 添加微妙的纹理效果
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.random() * 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// 绘制备忘录内容
function drawMemoContent(ctx, memo, width, height) {
  return new Promise((resolve) => {
    const padding = 30;
    const contentWidth = width - padding * 2;
    let currentY = padding + 20;
    
    // 设置默认字体和颜色
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // 0. 绘制用户名和角色名（左上角）
    try {
      let userName = 'User';
      let charName = 'Character';
      
      // 尝试使用TavernHelper获取用户名和角色名
      if (window.TavernHelper && window.TavernHelper.substitudeMacros) {
        try {
          const userMacro = window.TavernHelper.substitudeMacros('{{user}}');
          const charMacro = window.TavernHelper.substitudeMacros('{{char}}');
          
          if (userMacro && userMacro !== '{{user}}') userName = userMacro;
          if (charMacro && charMacro !== '{{char}}') charName = charMacro;
        } catch (e) {
          // 如果宏替换失败，尝试其他方法
          charName = getCharacterName();
        }
      } else {
        // 如果没有TavernHelper，使用备用方法
        charName = getCharacterName();
      }
      
      ctx.font = '12px "QiushuiShotai", serif';
      ctx.fillStyle = '#666';
      ctx.textAlign = 'left';
      ctx.fillText(`${userName} → ${charName}`, padding, currentY);
      
      currentY += 20;
    } catch (e) {
      console.warn('Memo Manager: 获取用户名和角色名失败:', e);
      currentY += 15; // 如果失败，仍然保留一些空间
    }
    
    // 1. 绘制时间
    const timeText = new Date(memo.updatedAt || memo.createdAt).toLocaleString('zh-CN');
    ctx.font = '12px "QiushuiShotai", serif';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'right';
    ctx.fillText(timeText, width - padding, currentY);
    
    currentY += 25;
    
    // 2. 绘制标题（如果有）
    ctx.textAlign = 'left';
    if (memo.title && memo.title.trim()) {
      ctx.font = 'bold 20px "QiushuiShotai", serif';
      ctx.fillStyle = '#2c3e50';
      
      const titleLines = wrapText(ctx, memo.title.trim(), contentWidth);
      titleLines.forEach(line => {
        if (line.trim() === '') {
          // 空行也要占位
          currentY += 26;
        } else {
          ctx.fillText(line, padding, currentY);
          currentY += 26;
        }
      });
      
      currentY += 15;
    }
    
    // 3. 绘制装饰线
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, currentY);
    ctx.lineTo(padding + 40, currentY);
    ctx.stroke();
    
    currentY += 20;
    
    // 4. 绘制原文段落（突出显示）
    // 添加"摘录"标签
    ctx.font = '14px "QiushuiShotai", serif';
    ctx.fillStyle = '#4a9eff';
    ctx.fillText('摘录', padding, currentY);
    currentY += 18;
    
    ctx.font = '18px "QiushuiShotai", serif';
    ctx.fillStyle = '#34495e';
    
    // 添加引号
    ctx.font = 'bold 24px "QiushuiShotai", serif';
    ctx.fillStyle = '#4a9eff';
    ctx.fillText('"', padding, currentY);
    
    currentY += 5;
    
    // 原文内容
    ctx.font = '18px "QiushuiShotai", serif';
    ctx.fillStyle = '#34495e';
    
    const originalLines = wrapText(ctx, memo.originalText, contentWidth - 30);
    originalLines.forEach(line => {
      if (line.trim() === '') {
        // 空行也要占位
        currentY += 24;
      } else {
        ctx.fillText(line, padding + 15, currentY);
        currentY += 24;
      }
    });
    
    // 结束引号
    ctx.font = 'bold 24px "QiushuiShotai", serif';
    ctx.fillStyle = '#4a9eff';
    ctx.fillText('"', width - padding - 15, currentY - 24);
    
    currentY += 20;
    
    // 5. 绘制分隔线
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding + 15, currentY);
    ctx.lineTo(width - padding - 15, currentY);
    ctx.stroke();
    
    currentY += 20;
    
    // 6. 绘制注释内容
    // 添加"笔记"标签
    ctx.font = '14px "QiushuiShotai", serif';
    ctx.fillStyle = '#4a9eff';
    ctx.fillText('笔记', padding, currentY);
    currentY += 15;
    
    ctx.font = '16px "QiushuiShotai", serif';
    ctx.fillStyle = '#555';
    
    const contentLines = wrapText(ctx, memo.content, contentWidth);
    contentLines.forEach(line => {
      if (line.trim() === '') {
        // 空行也要占位
        currentY += 22;
      } else {
        ctx.fillText(line, padding, currentY);
        currentY += 22;
      }
    });
    
    // 添加一点间距到底部装饰
    currentY += 8;
    
    
    // 小标语
    ctx.font = '12px "QiushuiShotai", serif';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'center';
    ctx.fillText('- 来自酒馆Memo -', width / 2, currentY + 16);
    
    // 更新currentY到标语之后，确保有足够的底部间距
    currentY += 10; 
    
    resolve();
  });
}

// 文本换行函数
function wrapText(ctx, text, maxWidth) {
  // 首先按照用户的换行符分割
  const userLines = text.split(/\r?\n/);
  const lines = [];
  
  // 对每一行进行自动换行处理
  userLines.forEach(userLine => {
    if (userLine.trim() === '') {
      // 空行也要保留
      lines.push('');
      return;
    }
    
    const chars = userLine.split('');
    let currentLine = '';
    
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const testLine = currentLine + char;
      const testWidth = ctx.measureText(testLine).width;
      
      if (testWidth > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine !== '') {
      lines.push(currentLine);
    }
  });
  
  return lines;
}

function clearAllMemos() {
  if (!confirm('⚠️ 警告：此操作将删除所有聊天记录中的所有备忘录数据，且无法恢复！\n\n确定要继续吗？')) {
    return;
  }

  try {
    // 获取所有localStorage的键
    const keysToDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_STORAGE_KEY_PREFIX)) {
        keysToDelete.push(key);
      }
    }

    // 删除所有匹配的键
    keysToDelete.forEach(key => {
      localStorage.removeItem(key);
    });

    toastr.success(`已清空所有备忘录数据！共删除了 ${keysToDelete.length} 个聊天记录的备忘录。`);
    
    // 刷新当前显示
    renderMemoList();
  } catch (error) {
    console.error('Memo Manager: 清空备忘录失败:', error);
    toastr.error('清空操作失败，请重试！');
  }
}

initializeMemoManager(); 