/**
 * Hindi sentences for the notification texts the API stores in English (bell, home card and the Notifications page).
 * Key = the English template exactly as the backend builds it, `{name}` = the parts that are data (see
 * `src/lib/notification-text.ts` for what each placeholder matches). The Hindi sentence uses the same placeholders.
 * Order matters: the first template that matches wins, so the more specific one comes first.
 */
export const hindiNotificationTemplates: Record<string, string> = {
  // leave and regularization decisions (ApprovalsService + NotificationService.notifyDecision)
  "{kind} for {date} approved by {name} ({role})": "{kind} ({date}) को {name} ({role}) ने स्वीकृत किया",
  "{kind} for {date} declined by {name} ({role})": "{kind} ({date}) को {name} ({role}) ने अस्वीकृत किया",
  "{type} ({from} – {to}) approved by {name}": "{type} ({from} – {to}) को {name} ने स्वीकृत किया",
  "{type} ({from} – {to}) declined by {name}": "{type} ({from} – {to}) को {name} ने अस्वीकृत किया",
  "{type} ({date}) approved by {name}": "{type} ({date}) को {name} ने स्वीकृत किया",
  "{type} ({date}) declined by {name}": "{type} ({date}) को {name} ने अस्वीकृत किया",

  // tasks (TaskService, TaskCommentService, TaskJobs)
  "{name} mentioned you on {label}: {title}": "{name} ने {label} पर आपका उल्लेख किया: {title}",
  "{name} commented on {label}: {title}": "{name} ने {label} पर टिप्पणी की: {title}",
  "{name} assigned you {label}: {title}": "{name} ने {label} आपको सौंपा: {title}",
  "{name} made you accountable for {label}: {title}": "{name} ने आपको {label} के लिए जवाबदेह बनाया: {title}",
  "{label} moved to {status} by {name}": "{label} को {name} ने {status} में ले जाया",
  "{label} is overdue (due {due}): {title}": "{label} की समय सीमा पार हो गई (देय {due}): {title}",
  "{label} is due today at {time}: {title}": "{label} आज {time} बजे देय है: {title}",
  "{label} is due tomorrow at {time}: {title}": "{label} कल {time} बजे देय है: {title}",
  "{label} is due tomorrow: {title}": "{label} कल देय है: {title}",
  "{label} is due in 15 minutes (due {due}): {title}": "{label} 15 मिनट में देय है (देय {due}): {title}",
  "{label} is due in 1 hour (due {due}): {title}": "{label} 1 घंटे में देय है (देय {due}): {title}",
  "{label} is due in 4 hours (due {due}): {title}": "{label} 4 घंटे में देय है (देय {due}): {title}",
  "{label} is due in 1 day (due {due}): {title}": "{label} 1 दिन में देय है (देय {due}): {title}",
  "You were added to the project {name}": "आपको प्रोजेक्ट {name} में जोड़ा गया",

  // policies (PolicyService)
  "New policy: {title} — please read and accept it": "नई नीति: {title} — कृपया इसे पढ़ें और स्वीकार करें",
  "Updated policy: {title} — please read and accept it": "अद्यतन नीति: {title} — कृपया इसे पढ़ें और स्वीकार करें",
  "New policy: {title}": "नई नीति: {title}",
  "Updated policy: {title}": "अद्यतन नीति: {title}",
  "Reminder: please read and accept \"{title}\"": "अनुस्मारक: कृपया \"{title}\" पढ़ें और स्वीकार करें",

  // announcements, assets, letters, onboarding (AnnouncementService, AssetService, LettersService, OnboardingService)
  "Announcement: {title}": "घोषणा: {title}",
  "Asset assigned to you: {tag} ({asset})": "आपको संपत्ति सौंपी गई: {tag} ({asset})",
  "A letter was issued to you: {subject} ({reference})": "आपको एक पत्र जारी किया गया: {subject} ({reference})",
  "{name} submitted their onboarding details — ready for review": "{name} ने अपना ऑनबोर्डिंग विवरण जमा किया — समीक्षा के लिए तैयार",

  // payroll, people, tax (PayrollOperationsService, PeopleService, TaxOperationsService)
  "Your {month} payslip is ready": "आपकी {month} की वेतन पर्ची तैयार है",
  "{name} ({code}) joined — salary structure pending": "{name} ({code}) ने कार्यभार संभाला — वेतन संरचना लंबित है",
  "{item} proof approved": "{item} का प्रमाण स्वीकृत किया गया",
  "{item} proof rejected — {reason}": "{item} का प्रमाण अस्वीकृत किया गया — {reason}",
  "{n} investment proof approved — your TDS goes down from the next payroll": "{n} निवेश प्रमाण स्वीकृत — अगले पेरोल से आपका TDS घटेगा",
  "{n} investment proofs approved — your TDS goes down from the next payroll": "{n} निवेश प्रमाण स्वीकृत — अगले पेरोल से आपका TDS घटेगा",
  "Finance set your tax regime to the new regime": "वित्त विभाग ने आपकी कर व्यवस्था नई व्यवस्था पर सेट की",
  "Finance set your tax regime to the old regime": "वित्त विभाग ने आपकी कर व्यवस्था पुरानी व्यवस्था पर सेट की",

  // subscription (JobsService.jobSubscriptionWarnings)
  "Your {plan} subscription has ended — only the employee export works until it is renewed": "आपकी {plan} सदस्यता समाप्त हो गई है — नवीनीकरण तक केवल कर्मचारी निर्यात काम करेगा",
  "Your {plan} subscription ends today ({endsOn}) — contact JurisOne to renew": "आपकी {plan} सदस्यता आज ({endsOn}) समाप्त हो रही है — नवीनीकरण के लिए JurisOne से संपर्क करें",
  "Your {plan} subscription ends tomorrow ({endsOn}) — contact JurisOne to renew": "आपकी {plan} सदस्यता कल ({endsOn}) समाप्त हो रही है — नवीनीकरण के लिए JurisOne से संपर्क करें",
  "Your {plan} subscription ends in {days} days ({endsOn}) — contact JurisOne to renew": "आपकी {plan} सदस्यता {days} दिन में ({endsOn}) समाप्त हो रही है — नवीनीकरण के लिए JurisOne से संपर्क करें",

  // the lines the bell builds itself (ShellService)
  "{n} request waiting for approval": "{n} अनुरोध स्वीकृति की प्रतीक्षा में",
  "{n} requests waiting for approval": "{n} अनुरोध स्वीकृति की प्रतीक्षा में",
  "{n} investment proof to verify": "{n} निवेश प्रमाण सत्यापित करना है",
  "{n} investment proofs to verify": "{n} निवेश प्रमाण सत्यापित करने हैं",
  "{holiday} holiday on {date}": "{date} को {holiday} का अवकाश",
};

/** Month abbreviations as the backend prints them ("7 Oct"), in Hindi. */
export const hindiMonthAbbreviations: Record<string, string> = {
  Jan: "जन", Feb: "फ़र", Mar: "मार्च", Apr: "अप्रै", May: "मई", Jun: "जून",
  Jul: "जुल", Aug: "अग", Sep: "सित", Oct: "अक्टू", Nov: "नव", Dec: "दिस",
};

/** "8:49 pm" → the Hindi day-part. */
export const hindiDayParts: Record<string, string> = { am: "पूर्वाह्न", pm: "अपराह्न" };
