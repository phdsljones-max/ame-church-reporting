export default function Guide() {
  return (
    <div>
      <h2 style={{ color: "var(--burgundy)", marginTop: 0 }}>How to use AME Monthly Church Reporting</h2>
      <p className="helper">
        Plain-language directions for everyone who enters data. Information flows bottom-up:
        churches → PE districts → Annual Conference → Connectional.
      </p>

      <div className="card">
        <h3 className="section-title">The 4-step workflow: monthly → quarterly → annual</h3>
        <ol className="steps">
          <li>
            <strong>Each month — enter your church's numbers.</strong> Go to Dashboard → your church →
            "Monthly entry". Pick the month, fill in what you know, and press "Save draft" (keeps it
            private until you're ready) or "Submit this month" (marks it finished). A blank line shows
            as "Not entered" — that just means it isn't filled in yet.
          </li>
          <li>
            <strong>Each quarter — check the automatic rollup.</strong> Open "Quarterly rollup". The
            system adds your three months together by itself — no math on your end. If a month is
            missing, the page tells you which one, and the totals only count what was entered.
          </li>
          <li>
            <strong>Once a year — the annual report builds itself.</strong> Open "Annual report". It
            rolls all twelve months together and feeds the Annual Conference summary and the
            Connectional Pastor's Report (Parts B–E).
          </li>
          <li>
            <strong>Each quarter — leaders write their stories, then the composite is assembled.</strong>
            Component leaders (Stewards, WMS, Ushers…) write a "Written report". The secretary assembles
            all of them into the Composite Quarterly Conference Report, reviews the preview, then
            presses "Finalize report".
          </li>
        </ol>
      </div>

      <div className="card">
        <h3 className="section-title">Who enters what</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Role</th><th>Enters</th><th>Sees</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Owner</strong></td><td>District licenses; users; everything</td><td>Everything</td></tr>
              <tr><td><strong>District Admin</strong></td><td>Manages users; district events; manages districts</td><td>Their district's churches, rollups, and components</td></tr>
              <tr><td><strong>Church Editor</strong></td><td>Monthly numbers for their church; written reports; assembles the composite report; church events</td><td>Their church's reports, component reports, reconciliation flags</td></tr>
              <tr><td><strong>Component Leader</strong></td><td>Their auxiliary's quarterly report and written report</td><td>Their own component's reports</td></tr>
              <tr><td><strong>Presiding Elder</strong></td><td>Read-only dashboards and rollup views</td><td>All churches in the district + district rollup</td></tr>
              <tr><td><strong>Bishop</strong></td><td>Read-only dashboards and rollup views</td><td>Conference rollup</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">When things are due</h3>
        <ul>
          <li><strong>Monthly numbers:</strong> enter within the first week of the new month.</li>
          <li><strong>Component quarterly reports:</strong> due before the district's Quarterly Conference meeting.</li>
          <li><strong>Written reports:</strong> due the same time as the component quarterly reports, so the composite can be assembled.</li>
          <li><strong>Annual report:</strong> closes with the December monthly entry; it flows into the Annual Conference summary.</li>
        </ul>
      </div>

      <div className="card">
        <h3 className="section-title">How to fix a past month</h3>
        <ol className="steps">
          <li>Open your church's "Monthly entry".</li>
          <li>Use the <strong>Year</strong> and <strong>Month</strong> dropdowns to pick the month you need to fix.</li>
          <li>Change the numbers. The "What you have" list at the bottom shows exactly what's stored.</li>
          <li>Press "Save draft" or "Submit this month" — the quarterly and annual rollups update automatically.</li>
        </ol>
      </div>

      <div className="card">
        <h3 className="section-title">Reconciliation: fixing number mismatches</h3>
        <p>
          Sometimes a component's numbers don't match the pastor's numbers — for example, the Ushers
          count 120 in attendance while the pastor's monthly report says 100. Open the
          <strong> Components</strong> page and look at <strong>Reconciliation flags</strong>: each flag
          shows the component's number, the pastor's number, and what's different. Talk it through,
          agree on the right number, and correct the report. The flag clears on the next check.
        </p>
      </div>

      <div className="card" id="pwa-install">
        <h3 className="section-title">Install the app on your phone</h3>
        <p>
          AME Reports is an installable web app. Once installed it opens like a normal app from your
          home screen — and it still works offline for pages you've already opened. It needs{" "}
          <strong>HTTPS (a secure https:// address)</strong> — or <code>localhost</code> on your own
          computer — before the phone will offer to install it.
        </p>
        <h4 style={{ color: "var(--burgundy)" }}>iPhone (Safari)</h4>
        <ol className="steps">
          <li>Open the app's address in <strong>Safari</strong> (install only works in Safari).</li>
          <li>Tap the <strong>Share</strong> button (the square with the arrow pointing up).</li>
          <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
          <li>Tap <strong>Add</strong>. The "AME Reports" icon appears on your home screen.</li>
        </ol>
        <h4 style={{ color: "var(--burgundy)" }}>Android (Chrome)</h4>
        <ol className="steps">
          <li>Open the app's address in <strong>Chrome</strong>.</li>
          <li>Tap the browser menu (the <strong>⋮</strong> three dots in the corner).</li>
          <li>Tap <strong>"Install app"</strong> (or <strong>"Add to Home screen"</strong>).</li>
          <li>Confirm. The "AME Reports" icon appears on your home screen or app drawer.</li>
        </ol>
        <p className="helper">
          If you don't see an install option, the site is probably not on HTTPS yet — ask your
          administrator to host it on a secure (https://) address.
        </p>
      </div>

      <div className="card">
        <h3 className="section-title">Buttons and confirmations, explained</h3>
        <ul>
          <li><strong>Save draft</strong> — saves your work privately; nobody else sees it as final.</li>
          <li><strong>Submit this month</strong> — marks the month finished. You can still edit it later.</li>
          <li><strong>Assemble / Finalize</strong> — builds the composite report, then locks it as the official version.</li>
          <li><strong>Delete</strong> — always asks "are you sure?" first.</li>
        </ul>
      </div>

      <div className="card">
        <h3 className="section-title">About the Church Year</h3>
        <p>
          The Church Year is the rhythm of seasons the church has followed for centuries. Each
          season has its own color, and the Calendar page can show them right on the month grid —
          turn on "Show seasons &amp; holy days".
        </p>
        <p>
          <strong>Advent</strong> (violet) is the four weeks of waiting before Christmas.{" "}
          <strong>Christmas</strong> (white with gold) celebrates Christ's birth through the
          Baptism of the Lord. <strong>Lent</strong> (violet) is the forty days of prayer and
          repentance beginning on Ash Wednesday. <strong>Holy Week</strong> (deep purple) walks
          from Palm Sunday through Good Friday to Holy Saturday. <strong>Easter</strong> (white
          with gold) celebrates the resurrection for fifty days until <strong>Pentecost</strong> (red),
          when the Holy Spirit came. The rest of the year is <strong>Ordinary Time</strong> (green),
          for growth in faith day by day.
        </p>
      </div>

      <div className="card">
        <h3 className="section-title">Copyright</h3>
        <p>© 2026 Phoenix Rising AI Solutions. All Rights Reserved.</p>
      </div>
    </div>
  );
}
