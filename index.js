import { createElement, useEffect, useState, useSyncExternalStore, Fragment } from "https://jspm.dev/react";
import { createRoot } from "https://jspm.dev/react-dom/client";

const DEFAULT_CONDITIONS = {
  "url:mastodon": true,
  "url:mstdn": true,
  "url:misskey": true,
  "url:nijimiss": true,
  "url:threads": true,
};

function generateSearchURL(options = {}) {
  const { queryBase, contentConditions } = options;

  const searchQuery = `${queryBase} ${Object.keys(contentConditions).filter((condition) => contentConditions[condition]).join(" OR ")}`;

  const url = new URL("https://twitter.com/search");
  url.searchParams.set("q", searchQuery);
  return url.toString();
}

const App = () => {
  const [queryBase, setQueryBase] = useState("filter:follows");
  const conditionsJson = useStorage("conditions");
  const contentConditions = parseConditions(conditionsJson);
  const searchURL = generateSearchURL({ queryBase, contentConditions });
  return (
    /* <> */
    createElement(Fragment, {},
      /* <QueryBaseSelector queryBase={queryBase} setQueryBase={setQueryBase} /> */
      createElement(QueryBaseSelector, { queryBase, setQueryBase }),
      /* <ContentConditionsSelector contentConditions={contentConditions} setContentConditions={setContentConditions} /> */
      createElement(ContentConditionsSelector, { contentConditions, setContentConditions }),
      /* <div> */
      createElement("div", {},
        /* <a className="search" href={searchURL} target="_blank" rel="noopener noreferrer"> */
        createElement("a", { className: "search", href: searchURL, target: "_blank", rel: "noopener noreferrer" },
          "🔍検索"
        )
        /* </a> */
      )
      /* </div> */
    )
    /* </> */
  );
};

const RE_LIST_URL = /^(?:https?:\/\/twitter\.com\/i\/lists\/)?(\d+)$/;

const QueryBaseSelector = (props) => {
  const listsJson = useStorage("lists");
  const lists = JSON.parse(listsJson ?? "{}");
  const queryBaseCandidates = [
    "filter:follows",
    ...Object.keys(lists).map((id) => `list:${id}`),
  ];
  const { queryBase, setQueryBase } = props;

  const [isAddingList, setIsAddingList] = useState(false);
  const [addingListURL, setAddingListURL] = useState("");
  const listURLMatches = RE_LIST_URL.test(addingListURL);

  function addList(id) {
    const newLists = {
      ...lists,
      [id]: `リスト (id: ${id})`,
    };
    setStorage("lists", JSON.stringify(newLists));
  }

  return (
    /* <details> */
    createElement("details", {},
      /* <summary> */
      createElement("summary", {},
        "リストを選択"
      ),
      /* </summary> */
      /* <ul className="lists"> */
      createElement("ul", { className: "lists" },
        ...queryBaseCandidates.map((candidate) =>
          /* <li key={candidate}> */
          createElement("li", { key: candidate },
            /* <label> */
            createElement("label", {},
              /* <input */
              createElement("input", {
                /* type="radio" */
                type: "radio",
                /* name="queryBase" */
                name: "queryBase",
                /* value={candidate} */
                value: candidate,
                /* checked={candidate === queryBase} */
                checked: candidate === queryBase,
                /* onChange={... */
                onChange: (event) => {
                  setQueryBase(event.target.value);
                }
                /* } */
              }),
              /* /> */
              candidate === "filter:follows" ? "フォロー中のユーザーから検索" :
              candidate.startsWith("list:") ? lists[candidate.slice(5)] ?? `リスト (id: ${candidate.slice(5)})` :
              candidate
            ),
            /* </label> */
            candidate.startsWith("list:") ? /* <button */
              createElement("button", {
                /* type="button" */
                type: "button",
                /* onClick={...} */
                onClick: () => {
                  const newLists = { ...lists };
                  delete newLists[candidate.slice(5)];
                  setStorage("lists", JSON.stringify(newLists));
                  if (candidate === queryBase) {
                    setQueryBase("filter:follows");
                  }
                }
              },
                "削除"
              )
              /* </button> */
              : null
          ),
          /* </li> */
        )
      ),
      /* </ul> */
      isAddingList
      ? /* <form> */
        createElement("form", {},
          /* <input */
          createElement("input", {
            /* type="text" */
            type: "text",
            /* placeholder="https://twitter.com/i/lists/XXXXXXXXX" */
            placeholder: "https://twitter.com/i/lists/XXXXXXXXX",
            /* size={40} */
            size: 40,
            /* value={addingListURL} */
            value: addingListURL,
            /* onChange={...} */
            onChange: (e) => {
              setAddingListURL(e.target.value);
            },
          }),
          /* /> */
          /* <button */
          createElement("button", {
            /* type="submit" */
            type: "submit",
            /* disabled={!listURLMatches} */
            disabled: !listURLMatches,
            /* onClick={...} */
            onClick: (e) => {
              e.preventDefault();
              const id = RE_LIST_URL.exec(addingListURL)[1];
              addList(id);
              setAddingListURL("");
            }
          },
            "追加"
          ),
          /* </button> */
          /* <button type="button" onClick={() => setIsAddingList(false)}> */
          createElement("button", { type: "button", onClick: () => setIsAddingList(false) },
            "キャンセル"
          ),
        )
        /* </form> */
      :
        /* <button type="button" onClick={() => setIsAddingList(true)}> */
        createElement("button", { type: "button", onClick: () => setIsAddingList(true) },
          "リストを追加...",
        ),
        /* </button> */
    )
    /* </details> */
  );
};

const ContentConditionsSelector = (props) => {
  const { contentConditions, setContentConditions } = props;
  const [addingConditionType, setAddingConditionType] = useState(null);
  const [addingCondition, setAddingCondition] = useState("");
  return (
    /* <details> */
    createElement("details", {},
      /* <summary> */
      createElement("summary", {},
        "検索条件を追加"
      ),
      /* </summary> */
      /* <ul className="conditions"> */
      createElement("ul", { className: "conditions" },
        ...Object.entries(contentConditions).map(([condition, conditionEnabled]) =>
          /* <li key={condition}> */
          createElement("li", { key: condition },
            /* <label> */
            createElement("label", {},
              /* <input */
              createElement("input", {
                /* type="checkbox" */
                type: "checkbox",
                /* checked={hasOwn(contentConditions, condition)} */
                checked: conditionEnabled,
                /* onChange={...} */
                onChange: (e) => {
                  setContentConditions({
                    ...contentConditions,
                    [condition]: e.target.checked,
                  })
                },
              }),
              /* /> */
              condition.startsWith("url:") ? `URLに"${condition.slice(4)}"を含む` : `本文に"${condition}"を含む`,
              hasOwn(DEFAULT_CONDITIONS, condition) ? null :
                /* <button */
                createElement("button", {
                  /* type="button" */
                  type: "button",
                  /* onClick={...} */
                  onClick: () => {
                    const newConditions = { ...conditions };
                    delete newConditions[condition];
                    setContentConditions(newConditions);
                  }
                },
                  "削除"
                ),
                /* </button> */
            )
            /* </label> */
          )
          /* </li> */
        )
      ),
      /* </ul> */
      addingConditionType != null
      ? /* <form> */
        createElement("form", {},
          /* <input */
          createElement("input", {
            /* type="text" */
            type: "text",
            /* placeholder={addingConditionType === "url" ? "URLの一部" : "本文に含む文字列"} */
            placeholder: addingConditionType === "url" ? "URLの一部" : "本文に含む文字列",
            /* value={addingCondition} */
            value: addingCondition,
            /* onChange={...} */
            onChange: (e) => {
              setAddingCondition(e.target.value);
            },
          }),
          /* /> */
          /* <button */
          createElement("button", {
            /* type="submit" */
            type: "submit",
            /* disabled={!addingCondition} */
            disabled: !addingCondition,
            /* onClick={...} */
            onClick: (e) => {
              e.preventDefault();
              const key = addingConditionType === "url" ? `url:${addingCondition}` : addingCondition;
              setContentConditions({
                ...contentConditions,
                [key]: true,
              });
              setAddingCondition("");
            }
          },
            "追加"
          ),
          /* </button> */
          /* <button type="button" onClick={() => setIsAddingCondition(false)}> */
          createElement("button", { type: "button", onClick: () => setAddingConditionType(null) },
            "キャンセル"
          ),
        )
        /* </form> */
      :
        /* <> */
        createElement(Fragment, {},
          /* <button type="button" onClick={() => setIsAddingCondition("url")}> */
          createElement("button", { type: "button", onClick: () => setAddingConditionType("url") },
            "URL条件を追加...",
          ),
          /* </button> */
          /* <button type="button" onClick={() => setIsAddingCondition("content")}> */
          createElement("button", { type: "button", onClick: () => setAddingConditionType("content") },
            "本文条件を追加...",
          ),
        ),
        /* </> */
    )
    /* </details> */
  );
};

function parseConditions(conditionsJson) {
  const conditionsRaw = JSON.parse(conditionsJson ?? "{}");
  const conditions = {
    ...Object.fromEntries(Object.entries(DEFAULT_CONDITIONS).map(([cond, defaultEanbled]) =>
      [cond, hasOwn(conditionsRaw, cond) ? conditionsRaw[cond] : defaultEanbled])),
    ...conditionsRaw,
  };
  return conditions;
}

function setContentConditions(conditions) {
  setStorage("conditions", JSON.stringify(conditions));
}

const useStorage = (name) => {
  function subscribe(callback) {
    function onStorage() {
      callback();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("storage:self", onStorage);
    return () => {
      window.removeEventListener("storage:self", onStorage);
      window.removeEventListener("storage", onStorage);
    };
  }
  function getSnapshot() {
    return localStorage.getItem(name);
  }
  return useSyncExternalStore(subscribe, getSnapshot);
};
function setStorage(name, value) {
  localStorage.setItem(name, value);
  window.dispatchEvent(new CustomEvent("storage:self"));
}
function removeStorage(name) {
  localStorage.removeItem(name);
  window.dispatchEvent(new CustomEvent("storage:self"));
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

const root = createRoot(document.querySelector("#app"));
root.render(createElement(App));
