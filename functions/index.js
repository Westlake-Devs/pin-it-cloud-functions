const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();
const adminsDoc = db.doc("/root/internal/user-groups/admins");

// give admin permissions to another user
exports.addAdminUser = functions.https.onCall(async (data, context) => {
  const email = context.auth.token.email;
  await isAuthorized(email);

  await makeAuthorized(data.email);
  return { result: `User ${data.email} has been given admin permissions.` };
});


// give admin permissions to user requesting for permissions, if that user is authorized
exports.grantAdminPermissions = functions.https.onCall(async (data, context) => {
  const email = context.auth.token.email;
  if (context.auth.token.admin) {
    return { result: `User ${email} is already given admin permissions.` };
  }

  await isAuthorized(email);

  await setAdmin(email);
  return { result: `User ${email} has been given admin permissions.` };
});

// check if user is authorized
exports.isAuthorized = functions.https.onCall(async (data, context) => isAuthorized(context.auth.token.email))

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
    if (!(email in dat)) throw new functions.https.HttpsError('permission-denied', `User ${email} is not authorized to use admin permissions.`);
  }
}

// set user as being authorized
async function makeAuthorized(email) {
  const update = {};
  update[`${email}`] = null;
  await adminsDoc.update(update);
}

// Create and Deploy Your First Cloud Functions
exports.helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello from Firebase!");
});
