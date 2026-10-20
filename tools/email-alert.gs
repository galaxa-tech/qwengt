/**
 * Galaxa Tech: free email alert for new website requests.
 * Runs as a Google Apps Script web app owned by mail.galaxatech@gmail.com.
 * Deploy: script.google.com > New project > paste this file > Deploy > New deployment >
 *         type "Web app" > Execute as: Me > Who has access: Anyone > copy the web app URL
 *         and put it in src/js/main.js (CONFIG.alertUrl). Then rebuild and deploy the site.
 * Cost: free (Gmail sending limit applies, far above what this site needs).
 */
function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    var lines = [];
    ['name', 'email', 'business', 'website', 'service', 'message'].forEach(function (k) {
      if (d[k]) lines.push(k.toUpperCase() + ': ' + String(d[k]).slice(0, 2000));
    });
    var type = String(d.type || 'WEBSITE REQUEST').slice(0, 80);
    MailApp.sendEmail({
      to: 'mail.galaxatech@gmail.com',
      subject: 'New request: ' + type + (d.name ? ' from ' + String(d.name).slice(0, 80) : ''),
      body: lines.join('\n') + '\n\nAlso saved in Firebase (Firestore Database).',
      replyTo: d.email || ''
    });
  } catch (err) {}
  return ContentService.createTextOutput('ok');
}
