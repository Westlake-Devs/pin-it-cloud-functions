const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const paths = {
  pendingPosts: 'root/pending/posts/',
  publicPosts: 'root/public/posts/',

  publicAttachments: 'root/public/',
  pendingAttachments: 'root/pending/',

  pendingEdits: 'root/pending/edit/',

  adminDoc: '/root/internal/user-groups/admins'
}

const db = admin.firestore();
const adminsDoc = db.doc(paths.adminDoc);

// determine whether a user is authorized to gain admin access
async function isAuthorized(email) {
  try {
    let doc = await adminsDoc.get();
    if(!doc.exists) return false
    else return !(email in dat)
  } catch (err) {
    console.log(err)
    return false
  }
}

// set a given user as an admin
async function setAdmin(email) {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, {
    admin: true,
  });
}

// specify that a user is not an admin
async function removeAdmin(email) {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, {
    admin: null,
  });
}

// authorize a user for admin permissions
async function makeAuthorized(email) {
  const update = {};
  update[`${email}`] = null;
  await adminsDoc.update(update);
}

// give admin permissions to user checking for permissions, if that user is authorized, otherwise classify that user as unauthoirzed
exports.checkAdminPermissions = functions.https.onCall(async (data, context) => {
  const email = context.auth.token.email;
  if (await isAuthorized(email)) {
    await setAdmin(email);
    return { result: `User ${email} has been given admin permissions.` };
  }
  else {
    await removeAdmin(email);
    throw new functions.https.HttpsError('permission-denied', `User ${email} is not authorized to use admin permissions.`);
  }
});


// give admin permissions to another user
exports.addAdminUser = functions.https.onCall(async (data, context) => {
  const email = context.auth.token.email;
  if (await isAuthorized(email)) {
    await makeAuthorized(data.email);
    return { result: `User ${data.email} has been given admin permissions.` };
  } else throw new functions.https.HttpsError('permission-denied', `User ${email} is not authorized to use admin permissions.`);
});

// Create and Deploy Your First Cloud Functions
exports.helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello from Firebase!");
});

// handle deletions of public posts: deleting pending edits of deleted public posts
exports.deletePendingEditsOnPublicDeletion = functions.firestore
  .document(`${paths.publicPosts}{postId}`)
  .onDelete((snap, context) => {
    const data = snap.data();
    const id = data.id;
    db.doc(`${paths.pendingPosts}${id}`).delete();
});

