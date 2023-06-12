const instance = 'Synergatika.gr';

class Translation {

  public content = {
    ["en-EN" as string]: {
      internal_activation: {
        "subject": "[internal] Account Created",
        "title": "A user has been registered and needs to become activated.",
        "body": "",
        "button": ""
      },
      internal_deactivation: {
        "subject": "[internal] Account Deactivated",
        "title": "A user has deactivate his/her account.",
        "body": "",
        "button": ""
      },
      internal_deletion: {
        "subject": "[internal] Account Deletion",
        "title": "A user has removed his/her account.",
        "body": "",
        "button": ""
      },
      internal_communication: {
        "subject": "[internal] User Communication",
        "title": "A user has sent an email to our team.",
        "body": "",
        "button": ""
      },
      new_support_partner: {
        "subject": "Α user has promise a fund for your cause",
        "title": "Supporting Info",
        "body": "",
        "button": ""
      },
      new_support_member: {
        "subject": "Your support has been registered",
        "title": ["Your support has been paid.", "Please follow the instructions to complete it."],
        "body": "",
        "button": ""
      },
      change_support_status: {
        "subject": "News about your order",
        "title": ["You support status has change to \'Paid\'", "You support status has change to \'Unpaid\'"],
        "body": "",
        "button": ""
      },
      redeem_support: {
        "subject": "Redeem Support Tokens",
        "title": "You support has been redeemed ",
      },
      campaign_starts: {
        "subject": "Microcredit Redeem Period starts",
        "title": "Microcredit Redeem Period starts"
      },
      invitation: {
        "subject": `You have been invited to ${instance} Community`,
        "title": "You 've got an invitation",
        "body": "",
        "button": ""
      },
      activation: {
        "subject": `Welcome to ${instance} Team`,
        "title": "Please, follow the link, login and set up your profile",
        "body": "",
        "button": "Log in"
      },
      deactivation: {
        "subject": "Your account has been deactivated",
        "title": ["Your account status has change to \'Non Active\' after Administrator´s decision.", "Your account status has change to \'Non Active\' after you request."],
        "body": "",
        "button": "Log in"
      },
      deletion: {
        "subject": "Your account has been removed",
        "title": "Thank you! We hope to see you again",
        "body": "",
      },
      registration: {
        "subject": `Welcome to ${instance} Team`,
        "title": "An acount has been created for you.",
        "body": "Please, follow the link, and login with the password bellow to reset your password",
        "registeredBy": ["Your account has been created after transaction with ", "Your Account has been created by Administrator"],
        "button": "Log In"
      },
      restoration: {
        "subject": "Update your Password",
        "title": "Please, follow the link to update your password",
        "body": "",
        "button": "Restore"
      },
      verification: {
        "subject": "Verify your email address",
        "title": "Please, follow the link to validate your email address.",
        "body": "Your account will be activated by our Amdin soon.",
        "button": "Veify"
      },
      notification: {
        "subject": "Το synergatika.gr Blockchain φαίνεται να αντιμετωπίζει κάποιο πρόβλημα!",
        "title": "Το synergatika.gr Blockchain φαίνεται να αντιμετωπίζει κάποιο πρόβλημα!",
        "body": "Θα μου πείτε τι πιο σύνηθες.",
      },
      common: {
        "EMAIL_TEXT": "Email",
        "REASON_TEXT": "Reason",
        "PASSWORD_TEXT": "Password",
        "CAMPAIGN_TEXT": "Campaign",
        "PAYMENT_TEXT": "Payment ID",
        "METHOD_TEXT": "Payment Method",
        "CONTENT_TEXT": "Content",
        "TOKENS_TEXT": "Amoount (€)",
        "IF_LINK": "If that doesn't work, copy and paste the following link in your browser:",
        "CHEERS": "Cheers",
        "TEAM": `${instance} Team`,
        "FOOTER": "You received this email because we received a request for your account. If you didn't request you can safely delete this email."
      },
      payments: [
        {
          bic: "ETHNGRAA",
          title: 'National Bank of Greece',
        }, {
          bic: "PIRBGRAA",
          title: 'Pireaus Bank',

        }, {
          bic: "EFGBGRAA",
          title: 'EFG Eurobank Ergasias',
        }, {
          bic: "CRBAGRAA",
          title: 'Alpha Bank A.E.',
        }, {
          bic: "PAYPAL",
          title: 'PayPal'
        }, {
          bic: "PAYPAL.ME",
          title: 'PayPal.Me'
        }, {
          bic: "store",
          title: "Pay at the Store"
        }
      ]
    },
    ["el-EL" as string]: {
      internal_activation: {
        "subject": "[internal] Δημιουργία Λογαρισμού",
        "title": "Ένας νεός Λογαρισμός έχει δημιουργηθεί και χρειάζεται ενεργοποίηση",
        "body": "",
        "button": ""
      },
      internal_communication: {
        "subject": "[internal] Μήνυμα απο Χρήστη",
        "title": "Ένας χρήστης προσπαθεί να επικοινωνήσει με την Ομάδα",
        "body": "",
        "button": ""
      },
      internal_deactivation: {
        "subject": "[internal] Απενεργοποίηση Λογαριασμού",
        "title": "Ένας Χρήστης απενεργοποίησε το λογαρισμό του/της",
        "body": "",
        "button": ""
      },
      internal_deletion: {
        "subject": "[internal] Διαγραφή Λογαρισμού",
        "title": "Ένας Χρήστης διέγραψε το λογαρισμό του/της",
        "body": "",
        "button": ""
      },
      new_support_partner: {
        "subject": "Μια νέα στήριξη μόλις καταγράφηκε",
        "title": "Λεπτομέριες:",
        "body": "",
        "button": ""
      },
      new_support_member: {
        "subject": "H υπόσχεση της στήριξης σας καταγράφηκε",
        "title": ["H Πληρωμή της υπόσχεσης σας έχει καταγραφεί.", "Ακολουθήστε τις οδηγίες για να ολοκληρωθεί η διαδικασία."],
        "body": "",
        "button": ""
      },
      change_support_status: {
        "subject": "Νέα σχετικά με τη στήριξη σας",
        "title": ["Η Κατάσταση της παραγγελίας άλλαξε σε \'Εξόφληση\'", "Η Κατάσταση της παραγγελίας άλλαξε σε \'Αναμονή Εξόφλησης\'"],
        "body": "",
        "button": "",
      },
      redeem_support: {
        "subject": "Πραγματοποιήθηκε επιτυχώς εξαργύρωση Υποστήριξης",
        "title": "Πραγματοποιήθηκε επιτυχώς εξαργύρωση ",
        "body": "",
        "button": ""
      },
      campaign_starts: {
        "subject": "Η περίοδος εξαργύρωσης ξεκινάει αύριο",
        "title": "Η περίοδος εξαργύρωσης ξεκινάει αύριο",
        "body": "",
        "button": ""
      },
      invitation: {
        "subject": `Έχεις πρόσκληση για την Κοινότητα του ${instance}`,
        "title": "Μόλις έλαβες μια πρόσκληση",
        "body": "",
        "button": ""
      },
      activation: {
        "subject": `Καλώς ήρθατε στην κοινότητα του ${instance}`,
        "title": "Κάντε σύνδεση και οργανώστε τις προσωπικές σας πληροφορίες.",
        "body": "",
        "button": "Είσοδος"
      },
      deactivation: {
        "subject": "Ο λογαριασμός σας έχει απενεργοποιηθεί",
        "title": ["Η κατάσταση του λογαρισμού σας άλλαξε σε \'Ανενεργή\' έπειτα από απόφαση του Διαχειριστή.", "Η κατάσταση του λογαρισμού σας άλλαξε σε \'Ανενεργή\' έπειτα από δική σας απαίτηση."],
        "body": "",
        "button": "Eίσοδος"
      },
      deletion: {
        "subject": "Ο λογαρισμός σας έχει αφαιρεθεί",
        "title": "Ευχαριστούμε! Ελπίζουμε να σας ξαναδούμε σύντομα",
        "body": "",
      },
      registration: {
        "subject": `Καλώς ήρθατε στην κοινότητα του ${instance}`,
        "title": "Κάντε σύνδεση και ανανεώστε τον προσωρινό Κωδικό Πρόσβασης",
        "body": "",
        "button": "Είσοδος",
        "registeredBy": ["Ο Λογαρισμός σας δημιουργήθηκε μετά απο συναλλαγή με το κατάστημα ", "Ο Λογαρισμός σας δημιουργήθηκε από τον διαχειριστή"],
      },
      restoration: {
        "subject": "Ανανέωση Κωδικού Πρόσβασης",
        "title": "Ακολουθήστε το παρακάτω λινκ",
        "body": "",
        "button": "Ανάκτηση"
      },
      verification: {
        "subject": "Επιβεβαίωση Διεύθυνσης Ηλεκτρονικού Ταχυδρομείου",
        "title": "Ακολουθήστε το παρακάτω λινκ",
        "body": "",
        "button": "Επιβεβαίωση"
      },
      notification: {
        "subject": "Το synergatika.gr Blockchain φαίνεται να αντιμετωπίζει κάποιο πρόβλημα!",
        "title": "Το synergatika.gr Blockchain φαίνεται να αντιμετωπίζει κάποιο πρόβλημα!",
        "body": "Θα μου πείτε τι πιο σύνηθες.",
      },
      common: {
        "EMAIL_TEXT": "Email",
        "REASON_TEXT": "Λόγος",
        "PASSWORD_TEXT": "Password",
        "CAMPAIGN_TEXT": "Καμπάνια",
        "PAYMENT_TEXT": "ID Πληρωμής",
        "CONTENT_TEXT": "Content",
        "METHOD_TEXT": "Μέθοδος Πληρωμής",
        "TOKENS_TEXT": "Ποσό (€)",
        "IF_LINK": "Εαν δεν μεταφερθείτε αυτόματα στη σελίδα μας, κάντε αντιγραφή/επικόλληση τον παρακάτω συνδεσμο",
        "CHEERS": "Χαιρετισμούς",
        "TEAM": `η Ομάδα του ${instance}`,
        "FOOTER": "Λάβατε αυτό το μήνυμα ηλεκτρονικού ταχυδρομίου, καθώς στάλθηκε μια αίτηση για/από το συγκεκριμένο λογαριασμό. Έαν, η αίτηση δεν στάλθηκε από εσάς, μπορείται να διαγράψετε με ασφάλεια αυτο το μήνυμα."
      },
      payments: [
        {
          bic: "ETHNGRAA",
          title: 'Εθνική Τράπεζα',
        }, {
          bic: "PIRBGRAA",
          title: 'Τράπεζα Πειραιώς',
        }, {
          bic: "EFGBGRAA",
          title: 'Eurobank Ergasias',
        }, {
          bic: "CRBAGRAA",
          title: 'Alpha Bank',
        }, {
          bic: "PAYPAL",
          title: 'PayPal'
        }, {
          bic: "PAYPAL.ME",
          title: 'PayPal.Me'
        }, {
          bic: "store",
          title: "Εξόφληση στο Κατάστημα"
        }
      ]
    }
  }
}
export default Translation;
