const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();
const adminsDoc = db.doc("/root/internal/user-groups/admins");

// give admin permissions to another user
exports.addAdminUser = functions.https.onCall((data, context) => {
});


// give admin permissions to user requesting for permissions, if that user is authorized
exports.grantAdminPermissions = functions.https.onCall(async (data, context) => {
  const email = context.auth.token.email;
  if (context.auth.token.admin) {
    return { result: `User ${email} is already given admin permissions.` };
  }

  let authorized = await isAuthorized(email);
  if (!authorized) {
    throw new functions.https.HttpsError('permission-denied', `User ${email} is not authorized to use admin permissions.`);
  }

  await setAdmin(email);
  return { result: `User ${email} has been given admin permissions.` };
});

// set a given user as an admin
async function setAdmin(email) {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, {
    admin: true,
  });
}

// determine whether a user is authorized to gain admin access
async function isAuthorized(email) {
  let doc = await adminsDoc.get();
  if(!doc.exists) {
    throw new functions.https.HttpsError('permission-denied', `User ${email} is not authorized to use admin permissions.`);
  }
  else {
    const dat = doc.data();
    console.log(`retrieved admins doc:\n${dat}`);
    return email in dat;
  }
}

// set user as being authorized
async function makeAuthorized(email) {

}

// Create and Deploy Your First Cloud Functions
exports.helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello from Firebase!");
});
