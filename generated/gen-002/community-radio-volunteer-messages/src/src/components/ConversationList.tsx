import { ME, Thread } from '../data';
import { Filter, lastActivity, needsReply, unreadCount, useStore, waitingSince } from '../store';
import { Avatar, GroupAvatar, Icon, ago, firstName, listTime, otherMember, personName, threadTitle, waitDays } from '../util';

function preview(t: Thread) {
  const last = t.messages[t.messages.length - 1];
  if (!last) return 'No messages yet';
  const who = last.from === ME ? 'You: ' : t.kind === 'group' ? `${firstName(personName(last.from))}: ` : '';
  const body = last.log ? `${last.body} [log excerpt]` : last.body;
  return who + body.replace(/\s+/g, ' ');
}

export function ConversationList() {
  const { s, d } = useStore();
  const issue = s.issues.find((i) => i.id === s.issueFilter);

  const q = s.search.trim().toLowerCase();
  let list = s.threads.filter((t) => t.messages.length > 0 || t.id === s.activeThreadId);
  if (issue) list = list.filter((t) => issue.threadIds.includes(t.id) || t.issueId === issue.id);
  else if (s.filter === 'needs') list = list.filter(needsReply);
  else if (s.filter === 'unread') list = list.filter((t) => unreadCount(t) > 0);
  if (q) {
    list = list.filter(
      (t) =>
        threadTitle(t).toLowerCase().includes(q) ||
        t.messages.some((m) => m.body.toLowerCase().includes(q) || m.log?.toLowerCase().includes(q)),
    );
  }
  list = [...list].sort((a, b) => (lastActivity(b) > lastActivity(a) ? 1 : -1));

  const counts: Record<Filter, number> = {
    all: s.threads.filter((t) => t.messages.length > 0).length,
    needs: s.threads.filter(needsReply).length,
    unread: s.threads.filter((t) => unreadCount(t) > 0).length,
  };

  return (
    <section className="convlist">
      <header className="convlist-head">
        <h1>{issue ? issue.title : 'Inbox'}</h1>
        {issue && (
          <button className="link-btn" onClick={() => d({ type: 'issueFilter', issueId: null })}>
            <Icon name="x" size={13} /> Clear
          </button>
        )}
      </header>
      <div className="search">
        <Icon name="search" size={15} />
        <input
          placeholder="Search people, threads, logs"
          value={s.search}
          onChange={(e) => d({ type: 'search', search: e.target.value })}
        />
        {s.search && (
          <button className="icon-btn" aria-label="Clear search" onClick={() => d({ type: 'search', search: '' })}>
            <Icon name="x" size={13} />
          </button>
        )}
      </div>
      {!issue && (
        <div className="tabs" role="tablist">
          {(['all', 'needs', 'unread'] as Filter[]).map((f) => (
            <button key={f} role="tab" aria-selected={s.filter === f}
              className={`tab ${s.filter === f ? 'active' : ''}`} onClick={() => d({ type: 'filter', filter: f })}>
              {f === 'all' ? 'All' : f === 'needs' ? 'Needs reply' : 'Unread'}
              <span className="tab-count">{counts[f]}</span>
            </button>
          ))}
        </div>
      )}
      {issue && <div className="issue-banner">{issue.subtitle}</div>}

      <ul className="threads">
        {list.length === 0 && (
          <li className="empty">
            {s.filter === 'needs' && !q ? 'Everyone has heard back from you.' : 'No conversations match.'}
          </li>
        )}
        {list.map((t) => {
          const unread = unreadCount(t);
          const wait = waitingSince(t);
          const days = wait ? waitDays(wait) : 0;
          const other = otherMember(t);
          const linked = s.issues.find((i) => i.id === t.issueId && !i.resolved);
          return (
            <li key={t.id}>
              <button
                className={`thread-row ${s.activeThreadId === t.id ? 'active' : ''} ${unread ? 'unread' : ''}`}
                onClick={() => d({ type: 'open', threadId: t.id })}
              >
                <div className="row-avatar">
                  {t.kind === 'group' ? <GroupAvatar title={t.title!} size={36} /> : <Avatar id={other} size={36} />}
                  {t.kind === 'email' && <span className="row-badge"><Icon name="mail" size={10} stroke={2.2} /></span>}
                </div>
                <div className="row-main">
                  <div className="row-top">
                    <span className="row-title">{threadTitle(t)}</span>
                    {t.kind === 'group' && <span className="row-members">{t.members.length}</span>}
                    <span className="row-time">{listTime(lastActivity(t))}</span>
                  </div>
                  {t.kind === 'email' && <div className="row-subject">{t.title}</div>}
                  <div className="row-preview">{preview(t)}</div>
                  {(wait || linked) && (
                    <div className="row-tags">
                      {wait && (
                        <span className={`tag wait ${days >= 3 ? 'late' : days >= 1 ? 'mid' : ''}`}>
                          <Icon name="clock" size={11} stroke={2.2} /> Waiting {ago(wait)}
                        </span>
                      )}
                      {linked && !s.issueFilter && (
                        <span className={`tag issue ${linked.kind}`}>
                          {linked.kind === 'incident' ? 'Dead air 11/12' : 'Sat cover'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {unread > 0 && <span className="unread-pill">{unread}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
