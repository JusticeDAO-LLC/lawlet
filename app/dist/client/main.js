var architektAssets = {"main":1}

var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../architekt/web/runtime/client/assets.js
var assets = {};

// ../../architekt/web/runtime/client/importer.js
async function importAssets(path) {
  delete architektAssets[path];
  let res = await fetch(`/app/${path}.json`);
  let { stylesheet, assets: assets2 } = await res.json();
  if (stylesheet) {
    let tag = document.createElement("style");
    tag.textContent = stylesheet;
    document.head.appendChild(tag);
  }
  if (assets2) {
    Object.assign(assets, assets2);
  }
}

// ../../architekt/render/callbacks.js
function registerCallback(node, type, callback) {
  if (!node.callbacks)
    node.callbacks = [];
  node.callbacks.push({ type, callback });
}
function dispatchCallbacks(node, type, value) {
  if (!node.callbacks)
    return;
  for (let i = 0; i < node.callbacks.length; i++) {
    let e = node.callbacks[i];
    if (e.type === type) {
      node.callbacks.splice(i, 1);
      e.callback(value);
      i--;
    }
  }
}

// ../../architekt/render/context.js
var Context = class {
  constructor(node) {
    this.node = node;
    this.runtime = node.runtime;
  }
  get isServer() {
    return this.runtime.isServer;
  }
  get isClient() {
    return !this.runtime.isServer;
  }
  get parent() {
    return new Context(this.node.parent);
  }
  get cookies() {
    return this.runtime.cookies;
  }
  get global() {
    return this.node.global;
  }
  get state() {
    return this.node.state;
  }
  get dom() {
    return collectDom(this.node);
  }
  get upstream() {
    let accumulated = { ...this.node.public };
    let node = this.node;
    while (node = node.parent) {
      if (node.public)
        accumulated = {
          ...node.public,
          ...accumulated
        };
    }
    return accumulated;
  }
  public(data) {
    this.node.public = {
      ...this.node.public,
      ...data
    };
  }
  redraw({ all } = {}) {
    render(this.node);
  }
  teardown() {
    this.node.teardown = true;
  }
  afterRender(callback) {
    registerCallback(this.node, "afterRender", callback);
  }
  beforeDelete(callback) {
    registerCallback(this.node, "beforeDelete", callback);
  }
  afterDelete(callback) {
    registerCallback(this.node, "afterDelete", callback);
  }
  createOverlay(content) {
    let orgDraw = this.node.draw;
    let Overlay = this.runtime.createOverlay(content);
    let handle = {
      close: () => {
        this.node.draw = orgDraw || (() => {
        });
        render(this.node);
      }
    };
    this.node.draw = (...args) => {
      if (orgDraw)
        orgDraw(...args);
      Overlay({ handle });
    };
    render(this.node);
    return handle;
  }
};
function collectDom(node) {
  let elements = [];
  for (let child of node.children) {
    if (child.dom)
      elements.push(child.dom.element);
    else
      elements.push(...collectDom(child));
  }
  return elements;
}

// ../../architekt/render/render.js
var renderState = {
  runtime: void 0,
  stack: void 0
};
function render(node) {
  renderNode(node);
  walkNodes(node, (node2) => dispatchCallbacks(node2, "afterRender"));
}
function renderNode(node) {
  renderState.runtime = node.runtime;
  let stack = viewStack(
    node,
    node.draw,
    node.props,
    node.content
  );
  if (node.teardown) {
    deleteNode(node);
    node.parent.children[node.index] = createNode(node, node.index);
    return;
  }
  let commonLength = Math.min(node.children.length, stack.length);
  for (let i = 0; i < commonLength; i++) {
    let n = node.children[i];
    let blueprint = stack[i];
    if (needsTeardown(n, blueprint)) {
      deleteNode(n);
      node.children[i] = createNode(blueprint, i);
    } else {
      Object.assign(n, {
        props: blueprint.props,
        content: blueprint.content
      });
      renderNode(n);
    }
  }
  if (node.children.length > commonLength) {
    for (let n of node.children.splice(commonLength)) {
      deleteNode(n);
    }
  } else if (stack.length > commonLength) {
    for (let blueprint of stack.slice(commonLength)) {
      node.children.push(
        createNode(blueprint, node.children.length)
      );
    }
  }
}
function needsTeardown(node, blueprint) {
  return node.teardown || node.component !== blueprint.component;
}
function createNode(blueprint, index) {
  let node = {
    index,
    state: {},
    children: [],
    props: blueprint.props,
    content: blueprint.content,
    component: blueprint.component,
    parent: blueprint.parent,
    runtime: blueprint.parent.runtime,
    global: blueprint.parent.global,
    xid: Math.random()
  };
  let stackOrDraw = viewStack(
    node,
    blueprint.component.construct,
    blueprint.props,
    blueprint.content
  );
  if (stackOrDraw instanceof Promise) {
    node.draw = () => {
    };
    node.constructPromise = stackOrDraw.then((f) => {
      node.constructPromise = void 0;
      if (node.deleted)
        return;
      node.draw = f;
      render(node);
    }).catch((error) => {
      node.constructPromise = void 0;
      node.error = error;
      console.warn(`error while rendering async component:
`, error);
    });
    return node;
  } else if (typeof stackOrDraw === "function") {
    node.draw = stackOrDraw;
    stackOrDraw = viewStack(
      node,
      stackOrDraw,
      blueprint.props,
      blueprint.content
    );
  } else {
    node.draw = blueprint.component.construct;
  }
  for (let blueprint2 of stackOrDraw) {
    node.children.push(
      createNode(blueprint2, node.children.length)
    );
  }
  return node;
}
function deleteNode(node) {
  walkNodes(node, (node2) => dispatchCallbacks(node2, "beforeDelete"));
  node.deleted = true;
  walkNodes(node, (node2) => dispatchCallbacks(node2, "afterDelete"));
}
function viewStack(node, draw, props, content) {
  let stack = renderState.stack = [];
  let contentFunc;
  if (typeof content === "function") {
    contentFunc = (...args) => {
      let offset = renderState.stack.length;
      return content(...args) || renderState.stack.slice(offset);
    };
  } else if (Array.isArray(content)) {
    contentFunc = () => {
      renderState.stack.push(...content);
      return content;
    };
  }
  let returnedStack = draw(
    {
      ...props,
      ctx: new Context(node)
    },
    contentFunc
  );
  renderState.stack = void 0;
  if (typeof returnedStack === "function" || returnedStack instanceof Promise)
    return returnedStack;
  if (Array.isArray(returnedStack))
    stack = returnedStack;
  if (returnedStack?.component || returnedStack?.view)
    stack = [returnedStack];
  let fullstack = [];
  for (let blueprint of stack) {
    if (blueprint.view) {
      fullstack.push(
        ...viewStack(
          node,
          blueprint.view,
          blueprint.props,
          blueprint.content
        )
      );
    } else {
      fullstack.push(blueprint);
    }
  }
  return fullstack.map(
    (blueprint) => ({
      ...blueprint,
      parent: node
    })
  );
}
function createDom(node, element) {
  let parentNode = node;
  let parentDom;
  let index = [node.index];
  while (parentNode = parentNode.parent) {
    parentDom = parentNode.dom;
    if (parentDom)
      break;
    index.unshift(parentNode.index);
  }
  let insertAfter = parentDom.children.length - 1;
  while (insertAfter >= 0) {
    let child = parentDom.children[insertAfter];
    if (child.index.some((i, p) => i < index[p]))
      break;
    else
      insertAfter--;
  }
  node.dom = {
    parent: parentDom,
    element,
    children: []
  };
  parentDom.element.insertBefore(
    element,
    parentDom.children[insertAfter + 1]?.element
  );
  parentDom.children.splice(
    Math.max(0, insertAfter + 1),
    0,
    {
      element,
      index
    }
  );
}
function deleteDom(node, element) {
  try {
    node.dom.parent.element.removeChild(element);
  } catch {
  }
  node.dom.parent.children = node.dom.parent.children.filter(
    (child) => child.element !== element
  );
}
function walkNodes(node, func) {
  func(node);
  for (let child of node.children) {
    walkNodes(child, func);
  }
}

// ../../architekt/render/component.js
var component_default = (construct) => {
  let component = (props, content) => {
    if (typeof props === "function") {
      content = props;
      props = {};
    }
    let blueprint = {
      component,
      props,
      content
    };
    renderState.stack.push(blueprint);
    return blueprint;
  };
  return Object.assign(component, { construct });
};

// ../../architekt/render/fragment.js
var fragment_default = (view) => {
  return (props, content) => {
    if (typeof props === "function") {
      content = props;
      props = {};
    }
    let fragment = {
      view,
      props,
      content
    };
    renderState.stack.push(fragment);
    return fragment;
  };
};

// ../../architekt/ui/stylesheet.js
var stylesheet_default = component_default(({ ctx, xid }) => {
  ctx.afterRender(() => {
    for (let element of ctx.parent.dom) {
      element.classList.add(xid);
    }
  });
});

// ../../architekt/ui/components/index.js
var Root = (...args) => renderState.runtime.components.Root(...args);
var VStack = (...args) => renderState.runtime.components.VStack(...args);
var HStack = (...args) => renderState.runtime.components.HStack(...args);
var Absolute = (...args) => renderState.runtime.components.Absolute(...args);
var Headline = (...args) => renderState.runtime.components.Headline(...args);
var Text = (...args) => renderState.runtime.components.Text(...args);
var Button = (...args) => renderState.runtime.components.Button(...args);
var TextInput = (...args) => renderState.runtime.components.TextInput(...args);
var Form = (...args) => renderState.runtime.components.Form(...args);
var Table = Object.defineProperty(
  (...args) => renderState.runtime.components.Table(...args),
  "Row",
  {
    get: () => renderState.runtime.components.Table.Row
  }
);

// ../../architekt/forms/node_modules/@mwni/events/emitter.js
function createEmitter() {
  let listeners = [];
  return {
    on(type, callback) {
      listeners.push({ type, callback });
      return this;
    },
    once(type, callback) {
      listeners.push({ type, callback, once: true });
      return this;
    },
    off(type, callback) {
      listeners = listeners.filter(
        (listener) => !(listener.type === type && (!callback || callback === listener.callback))
      );
      return this;
    },
    emit(type, data) {
      let matchedListeners = listeners.filter(
        (listener) => listener.type === type
      );
      listeners = listeners.filter(
        (listener) => !(listener.once && matchedListeners.includes(listener))
      );
      for (let { callback } of matchedListeners) {
        callback(data);
      }
      return this;
    }
  };
}

// ../../architekt/forms/model.js
var model_default = ({ data: initalData, constraints = [], submit: submitFunc }) => {
  let model;
  let events = createEmitter();
  let data = { ...initalData };
  let fieldStatus = {};
  let submitting = false;
  let submissionError;
  function applyConstraints(final) {
    fieldStatus = {};
    for (let { key, check, eager } of constraints) {
      if (!final && !eager)
        continue;
      if (fieldStatus[key]?.valid === false)
        continue;
      try {
        check(data);
        fieldStatus[key] = { valid: true };
      } catch (error) {
        fieldStatus[key] = {
          valid: false,
          message: error.toString()
        };
      }
    }
  }
  return model = {
    ...events,
    get data() {
      return data;
    },
    get fieldStatus() {
      return fieldStatus;
    },
    get isEagerValid() {
      return constraints.filter(({ eager }) => eager).every(({ key }) => fieldStatus[key]?.valid);
    },
    get canSubmit() {
      return constraints.every(({ key }) => fieldStatus[key]?.valid);
    },
    get submitting() {
      return submitting;
    },
    get submissionError() {
      return submissionError;
    },
    get(key) {
      return data[key];
    },
    set(key, value, options = {}) {
      data[key] = value;
      applyConstraints();
      if (!options.retainErrors)
        submissionError = void 0;
      events.emit("change", { key, value });
      events.emit("update");
    },
    isValid(key) {
      return fieldStatus[key]?.valid;
    },
    async validate() {
      await applyConstraints(true);
      events.emit("update");
      if (!model.canSubmit)
        throw {
          expose: true,
          fields: fieldStatus
        };
    },
    async submit(f = submitFunc) {
      if (!f)
        throw new Error(`no submission function given`);
      submitting = true;
      events.emit("update");
      try {
        await model.validate();
        return await f(data);
      } catch (error) {
        if (error.fields)
          Object.assign(fieldStatus, error.fields);
        submissionError = {
          ...error,
          message: error.message
        };
        throw error;
      } finally {
        submitting = false;
        events.emit("update");
      }
    }
  };
};

// ../../architekt/forms/components/form.js
var form_default = component_default(({ ctx, model, ...props }) => {
  let redraw = ctx.redraw.bind(ctx);
  ctx.public({ model });
  ctx.afterDelete(() => model.off("update", redraw));
  model.on("update", redraw);
  return ({ model: newModel }, content) => {
    if (model !== newModel)
      return ctx.teardown();
    return [
      Form(
        {
          ...props,
          onsubmit: (evt) => {
            evt.preventDefault();
            model.submit();
          }
        },
        content
      )
    ];
  };
});

// ../../architekt/forms/components/text-input.js
var text_input_default = fragment_default(({ ctx, model, key, disabled, ...props }) => {
  model = model || ctx.upstream.model;
  TextInput({
    ...props,
    text: model.get(key),
    onInput: (event) => model.set(key, event.target.value),
    invalid: model.fieldStatus[key]?.valid === false,
    disabled: model.submitting || disabled
  });
});

// stylesheet:P:\Projects\lawlet\app\ui\App.scss
var App_default = () => stylesheet_default({
  xid: "pkcnb"
});

// ../../architekt/api/fetch.js
var config = {
  urlBase: ""
};
function architektFetch(url, options) {
  let combinedUrl = config.urlBase + url;
  return fetch(combinedUrl, options).catch((error) => {
    if (error.message === "Failed to fetch")
      throw new Error("Network Error");
    else
      throw error;
  });
}
architektFetch.config = (newConfig) => {
  Object.assign(config, newConfig);
};
var fetch_default = architektFetch;

// ../../architekt/api/client.js
function post({ path }) {
  return async (payload) => {
    let res = await fetch_default(path, {
      method: "post",
      body: JSON.stringify(payload),
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
    let data = await res.json();
    if (!res.ok) {
      throw {
        ...data,
        statusCode: res.status
      };
    }
    return data;
  };
}

// api:P:\Projects\lawlet\app\server\api.js
var answerQuestion = post({ path: "/api/answer" });

// ui/App.js
var App_default2 = component_default(({ ctx }) => {
  let submitting = false;
  let answer;
  let error;
  let model = model_default({
    data: {
      question: ""
    },
    constraints: [
      {
        key: "question",
        check: ({ question }) => {
          if (question.length === 0)
            throw "required";
        }
      }
    ],
    submit: async ({ question }) => {
      answer = (await answerQuestion({ question })).answer;
    }
  });
  async function submit() {
    try {
      error = void 0;
      submitting = true;
      ctx.redraw();
      await model.submit();
    } catch (e) {
      error = `${e.message} - Please retry!`;
    } finally {
      submitting = false;
      ctx.redraw();
    }
  }
  function reset() {
    answer = void 0;
    model.set("question", "");
    ctx.redraw();
    ctx.dom[0].querySelector("textarea").focus();
  }
  return () => {
    App_default();
    Root(() => {
      VStack({ class: "header" }, () => {
        Headline({
          text: "Lawlet \u2696\uFE0F"
        });
        Text({
          text: "Legal Question Answering"
        });
      });
      VStack({ class: "body" }, () => {
        form_default({ model }, () => {
          text_input_default({
            class: "question",
            key: "question",
            multiline: true,
            autoFocus: true,
            placeholder: "Ask a legal question and press [enter]",
            onKeyDown: (e) => {
              if (e.keyCode === 13)
                submit() + e.preventDefault();
            },
            disabled: submitting || answer && !error
          });
        });
        if (submitting) {
          ResponseBubble(() => {
            HStack({ class: "dots" }, () => {
              Text({ text: "\u2022" });
              Text({ text: "\u2022" });
              Text({ text: "\u2022" });
            });
          });
        } else if (error) {
          ResponseBubble(() => {
            Text({
              class: "error",
              text: error
            });
          });
        } else if (answer) {
          ResponseBubble(() => {
            Text({
              text: answer
            });
          });
          VStack({ class: "again" }, () => {
            Button({
              class: "reset",
              text: "Ask another question",
              onTap: reset
            });
          });
        }
      });
      Text({
        class: "powered",
        text: `\u{1F680} Powered by Hugging Face, Llama-2, LlamaIndex and OpenAI's Curie.`
      });
    });
  };
});
var ResponseBubble = fragment_default((props, content) => {
  HStack({ class: "response" }, () => {
    Text({
      class: "robot",
      text: "\u{1F916}"
    });
    VStack({ class: "bubble" }, () => {
      content();
    });
  });
});

// ../../architekt/html/dom.js
function setAttrs(element, attrs, previousAttrs) {
  if (attrs) {
    let isInput = element.tagName === "INPUT";
    let isFileInput = isInput && attrs.type === "file";
    if (isInput && attrs.type != null) {
      element.setAttribute("type", attrs.type);
    }
    for (let key in attrs) {
      setAttr(element, key, previousAttrs?.[key], attrs[key], isFileInput);
    }
  }
  if (previousAttrs) {
    let val;
    for (let key in previousAttrs) {
      if ((val = previousAttrs[key]) != null && (attrs == null || attrs[key] == null)) {
        removeAttr(element, key, val);
      }
    }
  }
}
function setAttr(element, key, old, value, isFileInput) {
  if (value === void 0) {
    element.removeAttribute(key);
    return;
  }
  if (key === "ctx" || old === value && !isFormAttribute(element, key) && typeof value !== "object" || key === "type" && element.tagName === "INPUT")
    return;
  if (key.startsWith("on"))
    return updateEvent(element, key, value);
  if (key.slice(0, 6) === "xlink:")
    element.setAttributeNS("http://www.w3.org/1999/xlink", key.slice(6), value);
  else if (key === "style")
    updateStyle(element, old, value);
  else if (hasPropertyKey(element, key)) {
    if (key === "value") {
      if ((element.tag === "INPUT" || element.tag === "TEXTAREA") && element.value === "" + value && (isFileInput || element === activeElement()))
        return;
      if (element.tag === "SELECT" && old !== null && element.value === "" + value)
        return;
      if (element.tag === "OPTION" && old !== null && element.value === "" + value)
        return;
      if (isFileInput && value.toString() !== "") {
        console.error("`value` is read-only on file inputs!");
        return;
      }
    }
    element[key] = value;
  } else {
    if (typeof value === "boolean") {
      if (value)
        element.setAttribute(key, "");
      else
        element.removeAttribute(key);
    } else {
      element.setAttribute(key === "className" ? "class" : key, value);
    }
  }
}
function removeAttr(element, key, old) {
  if (key === "key" || key === "is" || old == null)
    return;
  if (key[0] === "o" && key[1] === "n")
    updateEvent(element, key, void 0);
  else if (key === "style")
    updateStyle(element.dom, old, null);
  else if (hasPropertyKey(element, key) && key !== "className" && key !== "title" && !(key === "value" && (element.tagName === "OPTION" || element.tagName === "SELECT" && element.selectedIndex === -1 && element === activeElement())) && !(element.tagName === "INPUT" && key === "type")) {
    element[key] = null;
  } else {
    let nsLastIndex = key.indexOf(":");
    if (nsLastIndex !== -1)
      key = key.slice(nsLastIndex + 1);
    if (old !== false)
      element.removeAttribute(key === "className" ? "class" : key);
  }
}
function isFormAttribute(element, attr) {
  return attr === "value" || attr === "checked" || attr === "selectedIndex" || attr === "selected" && element === activeElement() || element.tagName === "OPTION" && element.parentNode === activeElement();
}
function activeElement() {
  return window.activeElement;
}
function hasPropertyKey(element, key) {
  return (element.tagName.indexOf("-") > -1 || key !== "href" && key !== "list" && key !== "form" && key !== "width" && key !== "height") && key in element;
}
var uppercaseRegex = /[A-Z]/g;
function toLowerCase(capital) {
  return "-" + capital.toLowerCase();
}
function normalizeKey(key) {
  return key[0] === "-" && key[1] === "-" ? key : key === "cssFloat" ? "float" : key.replace(uppercaseRegex, toLowerCase);
}
function updateStyle(element, old, style) {
  if (old === style) {
  } else if (style == null) {
    element.style.cssText = "";
  } else if (typeof style !== "object") {
    element.style.cssText = style;
  } else if (old == null || typeof old !== "object") {
    element.style.cssText = "";
    for (var key in style) {
      var value = style[key];
      if (value != null)
        element.style.setProperty(normalizeKey(key), String(value));
    }
  } else {
    for (var key in style) {
      var value = style[key];
      if (value != null && (value = String(value)) !== String(old[key])) {
        element.style.setProperty(normalizeKey(key), value);
      }
    }
    for (var key in old) {
      if (old[key] != null && style[key] == null) {
        element.style.removeProperty(normalizeKey(key));
      }
    }
  }
}
var EventDict = class {
  constructor() {
    this._ = null;
  }
  handleEvent(event) {
    let handler = this["on" + event.type];
    let result;
    if (typeof handler === "function")
      result = handler.call(event.currentTarget, event);
    else if (typeof handler.handleEvent === "function")
      handler.handleEvent(event);
    if (this._ && event.redraw !== false)
      (0, this._)();
    if (result === false) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
};
function updateEvent(element, key, value) {
  if (element.events) {
    element.events._ = null;
    if (element.events[key] === value)
      return;
    if (value && (typeof value === "function" || typeof value === "object")) {
      if (element.events[key] == null)
        element.addEventListener(key.slice(2), element.events, false);
      element.events[key] = value;
    } else {
      if (element.events[key] != null)
        element.removeEventListener(key.slice(2), element.events, false);
      element.events[key] = void 0;
    }
  } else if (value != null && (typeof value === "function" || typeof value === "object")) {
    element.events = new EventDict();
    element.addEventListener(key.slice(2), element.events, false);
    element.events[key] = value;
  }
}

// ../../architekt/html/element.js
var element_default = component_default(({ ctx, tag }) => {
  let prevAttrs;
  let element;
  if (tag === "body") {
    element = ctx.runtime.document.body;
    ctx.node.dom = {
      element,
      children: []
    };
  } else {
    element = ctx.runtime.document.createElement(tag);
    createDom(ctx.node, element);
    ctx.afterDelete(() => {
      deleteDom(ctx.node, element);
    });
  }
  return ({ tag: newTag, ...attrs }, content) => {
    if (newTag !== tag) {
      ctx.teardown();
      return;
    }
    if (typeof content === "string") {
      attrs.textContent = content;
      content = void 0;
    }
    if (attrs.class)
      attrs.class = flattenClass(attrs.class);
    setAttrs(element, attrs, prevAttrs);
    prevAttrs = attrs;
    return content ? content() : void 0;
  };
});
function flattenClass(c) {
  return Array.isArray(c) ? c.filter(Boolean).map(flattenClass).join(" ") : c;
}

// ../../architekt/html/overlay.js
function createOverlay(content) {
  return component_default(({ ctx, handle }) => {
    ctx.public({ overlay: handle });
    ctx.node.dom = {
      element: ctx.runtime.document.body,
      children: []
    };
    return () => {
      Absolute({ class: "a-overlay" }, () => {
        content();
      });
    };
  });
}

// ../../architekt/html/components/index.js
var components_exports = {};
__export(components_exports, {
  Absolute: () => absolute_default,
  Button: () => button_default,
  Canvas: () => canvas_default,
  Checkbox: () => checkbox_default,
  Dropdown: () => dropdown_default,
  FileInput: () => file_input_default,
  Form: () => form_default2,
  Group: () => group_default,
  HScroll: () => h_scroll_default,
  HStack: () => h_stack_default,
  Headline: () => headline_default,
  Image: () => image_default,
  Interactive: () => interactive_default,
  Progress: () => progress_default,
  Radio: () => radio_default,
  Root: () => root_default,
  Slider: () => slider_default,
  Table: () => table_default,
  Text: () => text_default,
  TextInput: () => text_input_default2,
  VScroll: () => v_scroll_default,
  VStack: () => v_stack_default,
  WebLink: () => weblink_default
});

// ../../architekt/html/components/root.js
var root_default = component_default(({ ctx }) => {
  ctx.node.root = true;
  return (props, content) => element_default(
    {
      ...props,
      tag: "body",
      class: ["a-root", props.class]
    },
    content
  );
});

// ../../architekt/html/components/scroll.js
var scroll_default = component_default(({ ctx, direction }) => {
  let isRootScroller = ctx.parent.parent.node.root;
  let scrollElement = isRootScroller ? ctx.runtime.document.defaultView : void 0;
  ctx.afterRender(() => {
    if (!isRootScroller)
      scrollElement = ctx.dom[0];
    scrollElement.addEventListener("scroll", handleScroll);
  });
  ctx.afterDelete(() => {
    scrollElement.removeEventListener("scroll", handleScroll);
  });
  function handleScroll(evt) {
    if (isRootScroller) {
      ctx.state.scrollX = evt.target.body.scrollLeft;
      ctx.state.scrollY = evt.target.body.scrollTop;
    } else {
      ctx.state.scrollX = scrollElement.scrollLeft;
      ctx.state.scrollY = scrollElement.scrollTop;
    }
  }
  return (props, content) => {
    let [contentNode] = content();
    if (isRootScroller)
      return [contentNode];
    else
      return [
        element_default(
          {
            ...props,
            tag: "div",
            class: [`a-${direction}scroll`, props.class]
          },
          [contentNode]
        )
      ];
  };
});

// ../../architekt/html/components/v-scroll.js
var v_scroll_default = fragment_default((props, content) => scroll_default(
  {
    ...props,
    direction: "v"
  },
  content
));

// ../../architekt/html/components/h-scroll.js
var h_scroll_default = fragment_default((props, content) => scroll_default(
  {
    ...props,
    direction: "h"
  },
  content
));

// ../../architekt/html/components/v-stack.js
var v_stack_default = fragment_default(
  (props, content) => element_default(
    {
      ...props,
      tag: "div",
      class: ["a-vstack", props.class]
    },
    content
  )
);

// ../../architekt/html/components/h-stack.js
var h_stack_default = fragment_default(
  (props, content) => element_default(
    {
      ...props,
      tag: "div",
      class: ["a-hstack", props.class]
    },
    content
  )
);

// ../../architekt/html/components/absolute.js
var absolute_default = fragment_default((props, content) => element_default(
  {
    ...props,
    tag: "div",
    class: ["a-absolute", props.class]
  },
  content
));

// ../../architekt/html/components/headline.js
var headline_default = fragment_default(
  ({ text, tier, ...props }) => element_default(
    {
      ...props,
      tag: `h${tier || 1}`,
      class: ["a-headline", props.class],
      textContent: text
    }
  )
);

// ../../architekt/html/components/text.js
var text_default = fragment_default(
  ({ text, ...props }) => element_default(
    {
      ...props,
      tag: "span",
      class: ["a-text", props.class],
      textContent: text
    }
  )
);

// ../../architekt/html/components/button.js
var button_default = fragment_default(
  ({ text, onTap, type, ...props }, content) => element_default(
    {
      ...props,
      tag: "button",
      type: type || "button",
      class: ["a-button", props.class],
      onclick: onTap,
      textContent: text
    },
    text ? void 0 : content
  )
);

// ../../architekt/html/components/image.js
var image_default = component_default(({ ctx, svg, blob, url, ...props }) => {
  let src;
  if (svg)
    src = toSvgUrl(svg);
  else if (blob)
    src = toBlobUrl(blob);
  else
    src = url;
  return (newProps) => {
    if (svg !== newProps.svg || blob !== newProps.blob || url !== newProps.url)
      return ctx.teardown();
    element_default(
      {
        ...props,
        tag: "img",
        class: ["a-image", props.class],
        src
      }
    );
  };
});
function toSvgUrl(svg) {
  let header = "data:image/svg+xml,";
  let encoded = encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22");
  return header + encoded;
}
function toBlobUrl(blob) {
  return (window.URL || window.webkitURL).createObjectURL(blob);
}

// ../../architekt/html/components/interactive.js
var interactive_default = component_default(({ ctx }) => {
  return ({ onTap }, content) => {
    content();
    ctx.afterRender(
      () => {
        for (let element of ctx.dom) {
          element._onTap = onTap;
          if (!element.classList.contains("a-interactive")) {
            element.classList.add("a-interactive");
            element.addEventListener("click", (evt) => element._onTap(evt));
          }
        }
      }
    );
  };
});

// ../../architekt/html/components/weblink.js
var weblink_default = fragment_default(
  ({ text, url, external, ...props }, content) => element_default(
    {
      ...props,
      tag: "a",
      class: ["a-weblink", props.class],
      href: url,
      textContent: text,
      target: external ? "_blank" : void 0
    },
    text ? void 0 : content
  )
);

// ../../architekt/html/components/radio.js
var radio_default = fragment_default(({ ctx, checked, onChange, ...props }) => {
  if (checked === void 0) {
    checked = ctx.upstream.optionSelected;
  }
  element_default(
    {
      tag: "input",
      type: "radio",
      ...props,
      class: ["a-radio", props.class],
      checked,
      onchange: onChange
    }
  );
});

// ../../architekt/html/components/checkbox.js
var checkbox_default = fragment_default(({ ctx, checked, onChange, ...props }) => {
  if (checked === void 0) {
    checked = ctx.upstream.optionSelected;
  }
  element_default(
    {
      tag: "input",
      type: "checkbox",
      ...props,
      class: ["a-checkbox", props.class],
      checked,
      onchange: onChange
    }
  );
});

// ../../architekt/html/components/text-input.js
var text_input_default2 = component_default(({ ctx, autoFocus }) => {
  if (autoFocus) {
    ctx.afterRender(() => {
      ctx.dom[0].focus();
    });
  }
  return ({ text, multiline, secure, maxLength, onKeyDown, onInput, onChange, ...props }) => {
    if (multiline) {
      return element_default(
        {
          tag: "textarea",
          ...props,
          class: ["a-textinput", "multiline", props.class],
          value: text,
          maxlength: maxLength,
          onkeydown: onKeyDown ? (e) => (onKeyDown(e), true) : void 0,
          oninput: onInput,
          onchange: onChange
        }
      );
    } else {
      return element_default(
        {
          tag: "input",
          type: secure ? "password" : "text",
          ...props,
          class: ["a-textinput", props.class],
          value: text,
          maxlength: maxLength,
          onkeydown: onKeyDown ? (e) => (onKeyDown(e), true) : void 0,
          oninput: onInput,
          onchange: onChange
        }
      );
    }
  };
});

// ../../architekt/html/components/file-input.js
var file_input_default = fragment_default(({ ctx, onChange, multiple, ...props }, content) => {
  let xid = Math.random().toString(32).slice(2, 10);
  if (content) {
    element_default(
      {
        tag: "label",
        class: "a-fileinput",
        for: xid,
        ondragover: (event) => {
          event.preventDefault();
          ctx.public({ dropActive: true });
          ctx.redraw();
        },
        ondragenter: (event) => {
          event.preventDefault();
          ctx.public({ dropActive: true });
          ctx.redraw();
        },
        ondragleave: (event) => {
          event.preventDefault();
          ctx.public({ dropActive: false });
          ctx.redraw();
        },
        ondrop: (event) => {
          let input = document.getElementById(xid);
          ctx.public({ dropActive: false });
          ctx.redraw();
          event.preventDefault();
          input.files = event.dataTransfer.files;
          input.dispatchEvent(
            new Event("change")
          );
        }
      },
      content
    );
  }
  element_default(
    {
      tag: "input",
      type: "file",
      multiple,
      ...props,
      id: xid,
      class: [
        "a-fileinput",
        content && "custom",
        props.class
      ],
      onchange: (event) => onChange(
        multiple ? event.target.files : event.target.files[0]
      )
    }
  );
});

// ../../architekt/html/components/slider.js
var slider_default = fragment_default(({ value, onInput, onChange, ...props }) => {
  return element_default(
    {
      tag: "input",
      type: "range",
      ...props,
      class: ["a-slider", props.class],
      value,
      oninput: onInput,
      onchange: onChange
    }
  );
});

// ../../architekt/html/components/dropdown.js
var dropdown_default = fragment_default(({ value, options, onChange, ...props }) => {
  return element_default(
    {
      tag: "select",
      ...props,
      class: ["a-dropdown", props.class],
      value,
      onchange: onChange
    },
    () => options.map(
      ({ value: value2, text }) => element_default(
        {
          tag: "option",
          value: value2,
          textContent: text || value2
        }
      )
    )
  );
});

// ../../architekt/html/components/progress.js
var progress_default = fragment_default((props) => {
  let value;
  let max;
  if (props.value) {
    value = Math.round(props.value * 100);
    max = 100;
  }
  element_default(
    {
      ...props,
      tag: "progress",
      value,
      max,
      class: ["a-progress", props.class]
    }
  );
});

// ../../architekt/html/components/canvas.js
var canvas_default = component_default(({ ctx, controller }) => {
  let { afterDomCreation, afterRemove, afterDraw, isServer, teardown } = getContext();
  let wrap;
  let canvas;
  function resize() {
    canvas.width = wrap.clientWidth * window.devicePixelRatio;
    canvas.height = wrap.clientHeight * window.devicePixelRatio;
    canvas.style.width = `${wrap.clientWidth}px`;
    canvas.style.height = `${wrap.clientHeight}px`;
    canvas.dispatchEvent(new Event("resize"));
  }
  if (!isServer) {
    afterDomCreation((dom) => {
      wrap = dom[0];
      canvas = wrap.children[0];
      window.addEventListener("resize", resize);
      controller(canvas);
      afterRemove(() => {
        canvas.dispatchEvent(new Event("remove"));
      });
    });
  }
  return ({ controller: newController, ...props }) => {
    if (newController !== controller)
      return teardown();
    element_default(
      {
        tag: "div",
        class: "a-canvas-wrap"
      },
      () => element_default(
        "canvas",
        {
          ...props,
          class: ["a-canvas", props.class]
        }
      )
    );
    if (!isServer)
      afterDraw(resize);
  };
});

// ../../architekt/html/components/form.js
var form_default2 = fragment_default((props, content) => element_default(
  {
    ...props,
    tag: "form",
    class: ["a-form", props.class]
  },
  content
));

// ../../architekt/html/components/group.js
var group_default = component_default(({ ctx }, content) => {
  ctx.afterRender(() => {
    let dom = ctx.dom;
    for (let element of dom) {
      element.classList.add("a-group-member");
      element.addEventListener("click", (evt) => {
        for (let sibling of dom) {
          if (sibling === element)
            continue;
          console.log("click", sibling);
          sibling.click();
        }
      });
    }
  });
  return (props, content2) => content2();
});

// ../../architekt/html/components/table.js
var table_default = Object.assign(
  fragment_default((props, content) => {
    let rows = content();
    let headRows = [];
    let bodyRows = [];
    for (let row of rows) {
      if (row.props.head)
        headRows.push({
          ...row,
          props: {
            ...row.props,
            head: true
          }
        });
      else
        bodyRows.push(row);
    }
    return [
      element_default(
        {
          ...props,
          tag: "table"
        },
        () => {
          if (headRows.length > 0) {
            element_default(
              { tag: "thead" },
              headRows
            );
          }
          if (bodyRows.length > 0) {
            element_default(
              { tag: "tbody" },
              bodyRows
            );
          }
        }
      )
    ];
  }),
  {
    Row: fragment_default(
      ({ head, ...props }, content) => element_default(
        {
          ...props,
          tag: "tr"
        },
        () => {
          return content().map(
            (cell) => element_default(
              { tag: head ? "th" : "td" },
              [cell]
            )
          );
        }
      )
    )
  }
);

// ../../architekt/html/index.js
function mount(dom, component, props) {
  let node = {
    dom: {
      element: dom,
      children: []
    },
    children: [],
    draw: component,
    runtime: {
      createOverlay,
      document: dom.ownerDocument,
      components: components_exports
    },
    global: {}
  };
  render(node, props);
  dom.ownerDocument.defaultView.rootNode = node;
  return node;
}

// ../../architekt/web/runtime/client/icon.js
var icon_default = ({ asset, ...props }) => {
  asset = assets[asset.xid];
  if (!asset) {
    console.warn("icon component was given invalid asset");
    return;
  }
  if (asset.styleKeys?.length > 0) {
    return DynamicIcon({ asset, ...props });
  } else {
    return StaticIcon({ asset, ...props });
  }
};
var DynamicIcon = component_default(({ ctx, asset }) => {
  if (asset.type !== "svg")
    throw new Error(`dynamic ${asset.type} asset type not supported`);
  let state = {};
  return ({ asset: newAsset, ...props }) => {
    if (asset.xid !== newAsset.xid)
      return ctx.teardown();
    ctx.afterRender(() => {
      let img = ctx.dom[0];
      let style = window.getComputedStyle(img);
      let unchanged = true;
      let svg = asset.svg;
      for (let key of asset.styleKeys) {
        if (state[key] !== style.getPropertyValue(key)) {
          unchanged = false;
          break;
        }
      }
      if (unchanged)
        return;
      for (let key of asset.styleKeys) {
        state[key] = style.getPropertyValue(key);
        svg = svg.replaceAll(
          `{{${key}}}`,
          state[key]
        );
      }
      img.src = toDataURL(svg);
    });
    element_default({
      tag: "img",
      class: ["a-icon", props.class]
    });
  };
});
var StaticIcon = component_default(({ ctx, asset }) => {
  if (asset.type === "svg") {
    return (props) => element_default({
      tag: "img",
      class: ["a-icon", props.class],
      src: toDataURL(asset.svg)
    });
  } else if (asset.type === "image") {
    let img = new Image(asset.url);
    img.onload = () => {
      ctx.redraw();
    };
    return (props) => element_default({
      tag: "img",
      class: ["a-icon", props.class],
      src: img.complete ? asset.url : generatePlaceholder(asset.width, asset.height)
    });
  }
});
function generatePlaceholder(width, height) {
  return toDataURL(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`);
}
function toDataURL(svg) {
  let header = "data:image/svg+xml,";
  let encoded = encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22");
  return header + encoded;
}

// ../../architekt/web/runtime/client/html.js
var html_default = component_default(({ ctx, xid }) => {
  let { html } = assets[xid];
  ctx.runtime.document.head.innerHTML += html;
  return () => {
  };
});

// ../../architekt/web/runtime/client/page.js
var page_default = () => {
  let title = void 0;
  return {
    status: "ok",
    get title() {
      return title;
    },
    set title(t) {
      title = t;
      document.title = t;
    }
  };
};

// ../../architekt/web/runtime/client/cookies.js
var cookies_default = () => ({
  ...Object.fromEntries(
    new URLSearchParams(
      document.cookie.replace(/; /g, "&")
    )
  ),
  set: ({ key, value, maxAge, expires }) => {
    let parts = [`${key}=${value}`, `path=/`];
    if (maxAge) {
      parts.push(`expires=${new Date(Date.now() + maxAge).toGMTString()}`);
    } else if (expires) {
      parts.push(`expires=${expires.toGMTString()}`);
    }
    document.cookie = parts.join("; ");
  }
});

// ../../architekt/web/runtime/client/client.js
var client_default = async ({ App }) => {
  if (architektAssets.main) {
    await importAssets("main");
  }
  if (window.unloadSplash)
    window.unloadSplash();
  mount(
    document.body,
    fragment_default(({ ctx }) => {
      ctx.runtime.components.Icon = icon_default;
      ctx.runtime.components.HTML = html_default;
      Object.assign(ctx.runtime, {
        document,
        page: page_default(),
        cookies: cookies_default(),
        assets,
        config: typeof architektConfig !== "undefined" ? architektConfig : {}
      });
      App();
    })
  );
};

// client.js
client_default({ App: App_default2 });
