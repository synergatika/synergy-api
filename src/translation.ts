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
        "title": "Please follow the instructions to complete it.",
        "body": "",
        "button": ""
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
        "title": "Your account status has change to \'Non Active\'",
        "by_you": "after you request.",
        "by_admin": "after Administrator´s decision.",
        "body": "",
        "button": "Log in"
      },
      registration: {
        "subject": `Welcome to ${instance} Team`,
        "title": "An acount has been created for you.",
        "body": "Please, follow the link, and login with the password bellow to reset your password",
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
      common: {
        "EMAIL_TEXT": "Email",
        "REASON_TEXT": "Reason",
        "PASSWORD_TEXT": "Password",
        "METHOD_TEXT": "Payment Method",
        "TOKENS_TEXT": "Amoount (€)",
        "IF_LINK": "If that doesn't work, copy and paste the following link in your browser:",
        "CHEERS": "Cheers",
        "TEAM": `${instance} Team`,
        "FOOTER": "You received this email because we received a request for your account. If you didn't request you can safely delete this email."
      }
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
      new_support_partner: {
        "subject": "Ενας χρήστης έδωσε λεφτά",
        "title": "Υποσχεση",
        "body": "",
        "button": ""
      },
      new_support_member: {
        "subject": "Κατοχυρώθηκε η υπόσχεση",
        "title": "Υποσχεση",
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
        "title": "Η κατάσταση του λογαρισμού σας άλλαξε σε \'Ανενεργή\' ",
        "by_you": "έπειτα από δική σας απαίτηση.",
        "by_admin": "έπειτα από απόφαση του Διαχειριστή.",
        "body": "",
        "button": "Eίσοδος"
      },
      registration: {
        "subject": `Καλώς ήρθατε στην κοινότητα του ${instance}`,
        "title": "Κάντε σύνδεση και ανανεώστε τον προσωρινό Κωδικό Πρόσβασης",
        "body": "",
        "button": "Είσοδος"
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
      common: {
        "EMAIL_TEXT": "Email",
        "REASON_TEXT": "Λόγος",
        "PASSWORD_TEXT": "Password",
        "METHOD_TEXT": "Μέθοδος Πληρωμής",
        "TOKENS_TEXT": "Ποσό (€)",
        "IF_LINK": "Εαν δεν μεταφερθείτε αυτόματα στη σελίδα μας, κάντε αντιγραφή/επικόλληση τον παρακάτω συνδεσμο",
        "CHEERS": "Χαιρετισμούς",
        "TEAM": `η Ομάδα του ${instance}`,
        "FOOTER": "Λάβατε αυτό το μήνυμα ηλεκτρονικού ταχυδρομίου, καθώς στάλθηκε μια αίτηση για/από το συγκεκριμένο λογαριασμό. Έαν, η αίτηση δεν στάλθηκε από εσάς, μπορείται να διαγράψετε με ασφάλεια αυτο το μήνυμα."
      }
    }
  }
}
export default Translation;
