import { createElement, useEffect, useState, useSyncExternalStore, Fragment } from "https://jspm.dev/react";
import { createRoot } from "https://jspm.dev/react-dom/client";

const DEFAULT_CONDITIONS = {
  "Mastodon": false,
  "url:mastodon": true,
  "url:mstdn": true,
  "url:fedibird.com": true,
  "url:pawoo.net": true,
  "url:hostdon.ne.jp": false,
  "url:best-friends.chat": false,
  "url:mstdn.nere9.help": false,
  "url:oransns.com": false,
  "url:kirishima.cloud": false,
  "url:social.mikutter.hachune.net": false,
  "url:vtdon.com": false,
  "url:don.neet.co.jp": false,
  "url:vocalodon.net": false,
  "url:kmy.blue": false,
  "url:homoo.social": false,
  "url:mas.to": false,
  "url:micro.blog": false,
  "url:lemmy.world": false,
  "url:gc2.jp": false,
  "url:pixelfed.social": false,
  "url:techhub.social": false,
  "url:universeodon.com": false,
  "url:masto.ai": false,
  "url:c.im": false,
  "url:fosstodon.org": false,
  "url:infosec.exchange": false,
  "url:mathstodon.xyz": false,
  "url:ruby.social": false,
  "Misskey": false,
  "url:misskey": true,
  "url:nijimiss.moe": true,
  "url:sushi.ski": false,
  "url:trpger.us": false,
  "url:oekakiskey.com": false,
  "url:submarin.online": false,
  "Threads": false,
  "url:threads.net": false,
  "Bluesky": false,
  "url:bsky.app": false,
  "Nostr": false,
  "url:snort.social": false,
  "url:nostr.directory": false,
  "url:damus.io": false,
  "npub": false,
};

function generateSearchURL(options = {}) {
  const { baseQueries, enabledContentConditions } = options;

  const searchQuery = `${baseQueries.join(" ")} ${enabledContentConditions.map((query) => workaroundBlockedTLD(query)).join(" OR ")}`;

  const url = new URL("https://twitter.com/search");
  url.searchParams.set("q", searchQuery);
  return url.toString();
}

function workaroundBlockedTLD(query) {
  const m = /^url:(.*)\.net$/.exec(query);
  if (m) {
    return `url:"${m[1]} net"`;
  }
  return query;
}

const App = () => {
  const [queryBase, setQueryBase] = useState("filter:follows");
  const conditionsJson = useStorage("conditions");
  const contentConditions = parseConditions(conditionsJson);
  const enabledContentConditions = Object.keys(contentConditions).filter((condition) => contentConditions[condition]);
  const usingLastSeen = useStorage("fediconnect_use_last_seen") === "true";
  const lastSeen = useStorage("fediconnect_last_seen") ?? new Date().toISOString();
  const baseQueries = [
    queryBase,
    usingLastSeen ? `since:${lastSeen.replace("T", "_").replace(/\.\d+/, "").replace(/Z$/, "_UTC")}` : null,
  ].filter(Boolean);
  const searchURL = generateSearchURL({
    baseQueries,
    enabledContentConditions,
  });
  const [searchTimestamp, setSearchTimestamp] = useState(null);
  return (
    /* <> */
    createElement(Fragment, {},
      /* <QueryBaseSelector queryBase={queryBase} setQueryBase={setQueryBase} /> */
      createElement(QueryBaseSelector, { queryBase, setQueryBase }),
      /* <ContentConditionsSelector contentConditions={contentConditions} setContentConditions={setContentConditions} /> */
      createElement(ContentConditionsSelector, { contentConditions, setContentConditions }),
      /* <LastSeenSelector usingLastSeen={usingLastSeen} lastSeen={lastSeen} /> */
      createElement(LastSeenSelector, { usingLastSeen, lastSeen }),
      /* <div> */
      createElement("div", {},
        /* <a> */
        createElement("a", {
          /* className="search" */
          className: "search",
          /* href={searchURL} */
          href: searchURL,
          /* target="_blank" */
          target: "_blank",
          /* rel="noopener noreferrer" */
          rel: "noopener noreferrer",
          onClick: () => {
            if (searchTimestamp == null) {
              setSearchTimestamp(new Date().toISOString());
            }
          }
        },
          "🔍検索"
        ),
        /* </a> */
        // Show a button to set the last seen date to the current time.
        searchTimestamp != null
        ? /* <button */
          createElement("button", {
            /* type="button" */
            type: "button",
            /* onClick={...} */
            onClick: () => {
              setStorage("fediconnect_use_last_seen", "true");
              setStorage("fediconnect_last_seen", searchTimestamp);
              setSearchTimestamp(null);
            }
          },
            "日付をフィルタに記録"
          )
          /* </button> */
        : null,
      ),
      /* </div> */
      /* <details> */
      createElement("details", {},
        /* <summary> */
        createElement("summary", {},
          "ORを使わない検索"
        ),
        /* </summary> */
        /* <ul> */
        createElement("ul", { className: "condition-wise-buttons" },
          enabledContentConditions.map((singleContentCondition) =>
            /* <li key={singleContentCondition}> */
            createElement("li", { key: singleContentCondition },
              /* <a> */
              createElement("a", {
                /* className="search" */
                className: "search",
                /* href={searchURL} */
                href: generateSearchURL({
                  baseQueries,
                  enabledContentConditions: [singleContentCondition],
                }),
                /* target="_blank" */
                target: "_blank",
                /* rel="noopener noreferrer" */
                rel: "noopener noreferrer",
                onClick: () => {
                  if (searchTimestamp == null) {
                    setSearchTimestamp(new Date().toISOString());
                  }
                }
              },
                `🔍 ${singleContentCondition} を検索`
              ),
              /* </a> */
            )
            /* </li> */
          )
        ),
        /* </ul> */
        // Show a button to set the last seen date to the current time.
        searchTimestamp != null
        ? /* <button */
          createElement("button", {
            /* type="button" */
            type: "button",
            /* onClick={...} */
            onClick: () => {
              setStorage("fediconnect_use_last_seen", "true");
              setStorage("fediconnect_last_seen", searchTimestamp);
              setSearchTimestamp(null);
            }
          },
            "日付をフィルタに記録"
          )
          /* </button> */
        : null,
      )
      /* </details> */
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

  function removeList(id) {
    const newLists = { ...lists };
    delete newLists[id];
    setStorage("lists", JSON.stringify(newLists));
    if (`list:${id}` === queryBase) {
      setQueryBase("filter:follows");
    }
  }

  function setListName(id, name) {
    setStorage("lists", JSON.stringify({
      ...lists,
      [id]: name,
    }));
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
        /* <li key="filter:follows"> */
        createElement("li", { key: "filter:follows" },
          /* <label> */
          createElement("label", {},
            /* <input */
            createElement("input", {
              /* type="radio" */
              type: "radio",
              /* name="queryBase" */
              name: "queryBase",
              /* value="filter:follows" */
              value: "filter:follows",
              /* checked={"filter:follows" === queryBase} */
              checked: "filter:follows" === queryBase,
              /* onChange={... */
              onChange: (event) => {
                setQueryBase(event.target.value);
              }
              /* } */
            }),
            /* /> */
            "フォロー中のユーザーから検索"
          ),
          /* </label> */
        ),
        /* </li> */
        ...Object.entries(lists).map(([id, name]) =>
          /* <li key={`list:${id}`}> */
          createElement("li", { key: `list:${id}` },
            /* <ListLine */
            createElement(ListLine, {
              /* id={id} */
              id,
              /* name={name} */
              name,
              /* queryBase={queryBase} */
              queryBase,
              /* setQueryBase={setQueryBase} */
              setQueryBase,
              /* removeList={removeList} */
              removeList,
              /* setListName={setListName} */
              setListName,
            })
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

const ListLine = (props) => {
  const { id, name, queryBase, setQueryBase, removeList, setListName } = props;
  const [editName, setEditName] = useState(null);
  const radio = (
    /* <input */
    createElement("input", {
      /* type="radio" */
      type: "radio",
      /* name="queryBase" */
      name: "queryBase",
      /* value={`list:${id}`} */
      value: `list:${id}`,
      /* checked={`list:${id}` === queryBase} */
      checked: `list:${id}` === queryBase,
      /* onChange={... */
      onChange: (event) => {
        setQueryBase(event.target.value);
      }
      /* } */
    })
    /* /> */
  );
  return (
    editName != null
    ? /* <> */
      createElement(Fragment, {},
        radio,
        /* <form className="edit-list"> */
        createElement("form", { className: "edit-list" },
          /* <input */
          createElement("input", {
            /* type="text" */
            type: "text",
            /* value={editName} */
            value: editName,
            /* onChange={...} */
            onChange: (e) => {
              setEditName(e.target.value);
            },
          }),
          /* /> */
          /* <button */
          createElement("button", {
            /* type="submit" */
            type: "submit",
            /* disabled={!editName} */
            disabled: !editName,
            /* onClick={...} */
            onClick: (e) => {
              e.preventDefault();
              setListName(id, editName);
              setEditName(null);
            }
          },
            "保存"
          ),
          /* </button> */
          /* <button type="button" onClick={() => setEditName(null)}> */
          createElement("button", { type: "button", onClick: () => setEditName(null) },
            "キャンセル"
          ),
          /* </button> */
        )
        /* </form> */
      )
      /* </> */
    : /* <> */
      createElement(Fragment, {},
        /* <label> */
        createElement("label", {},
          radio,
          name
        ),
        /* </label> */
        /* <button type="button" onClick={() => setEditName(name)}> */
        createElement("button", { type: "button", onClick: () => setEditName(name) },
          "編集"
        ),
        /* </button> */
        /* <button */
        createElement("button", {
          /* type="button" */
          type: "button",
          /* onClick={...} */
          onClick: () => {
            removeList(id);
          }
        },
          "削除"
        ),
        /* </button> */
        /* <a href={`https://twitter.com/i/lists/${id}`} target="_blank" rel="noopener noreferrer"> */
        createElement("a", { href: `https://twitter.com/i/lists/${id}`, target: "_blank", rel: "noopener noreferrer" },
          "開く"
        ),
        /* </a> */
      )
      /* </> */
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
                    const newConditions = { ...contentConditions };
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

const LastSeenSelector = (props) => {
  const { usingLastSeen, lastSeen } = props;

  return (
    /* <details> */
    createElement("details", {},
      /* <summary> */
      createElement("summary", {},
        "日付フィルタ"
      ),
      /* </summary> */
      /* <div> */
      createElement("div", {},
        /* <label> */
        createElement("label", {},
          /* <input */
          createElement("input", {
            /* type="checkbox" */
            type: "checkbox",
            /* checked={usingLastSeen} */
            checked: usingLastSeen,
            /* onChange={...} */
            onChange: (e) => {
              setStorage("fediconnect_use_last_seen", `${e.target.checked}`);
            },
          }),
          /* /> */
          "日付フィルタを使う"
        ),
        /* </label> */
      ),
      /* </div> */
      /* <div> */
      createElement("div", {},
        "日付:",
        /* <input */
        createElement("input", {
          /* type="datetime-local" */
          type: "datetime-local",
          /* disabled={!usingLastSeen} */
          disabled: !usingLastSeen,
          /* value={lastSeen} */
          value: lastSeen.replace(/(?<=T\d{2}:\d{2}):\d{2}(\.\d+)?Z$/, ""),
          /* onChange={...} */
          onChange: (e) => {
            setStorage("fediconnect_last_seen", `${e.target.value}:00.000Z`);
          },
        }),
        /* /> */
        "UTC (※時差注意) 以降のツイートのみ検索",
      ),
      /* </div> */
    )
    /* </details> */
  );
};

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
