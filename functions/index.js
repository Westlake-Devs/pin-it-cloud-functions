const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp()

// give admin permissions to another user
exports.addAdminUser = functions.https.onCall((data, context) => {
  const email = data.email

});


// give admin permissions to user requesting for permissions, if that user is authorized
exports.grantAdminPermissions = functions.https.oncall((data, context) => {
  const email = data.email
  if (context.auth.token.admin) {
    return {
      result: "User ${email} is already given admin permissions."
    };
  }
  setAdmin(email).then(() => {
    return {
      result: "User ${email} has been given admin permissions."
    };
  });
});

// set a given user as an admin
async function setAdmin(email) {
  const user = await admin.auth().getUserByEmail(req);
  return admin.auth.setCustomUserClaims(user.uid, {
    admin = true,
  });
}

// determine whether a user has permission to gain admin access
async function isAuthorized(email) {

}

// set user as being authorized
async function makeAuthorized(email) {

}

// Create and Deploy Your First Cloud Functions
exports.helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello from Firebase!");
});
