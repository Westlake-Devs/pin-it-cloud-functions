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

// give admin permissions to another user
exports.addAdminUser = functions.https.onCall(async (data, context) => {
  const email = context.auth.token.email;
  await isAuthorized(email);

  await makeAuthorized(data.email);
  return { result: `User ${data.email} has been given admin permissions.` };
});

// check if user is authorized
exports.isAuthorized = functions.https.onCall(async (data, context) => isAuthorized(context.auth.token.email));

// set a given user as an admin
async function setAdmin(email) {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, {
    admin: true,
  });
}

// give admin permissions to user requesting for permissions, if that user is authorized
exports.checkAdminPermissions = functions.https.onCall(async (data, context) => {
  const email = context.auth.token.email;
  try {
    if (context.auth.token.admin) {
      return { result: `User ${email} is already given admin permissions.` };
    }

    await isAuthorized(email);
    await setAdmin(email);
    return { result: `User ${email} has been given admin permissions.` };
  } catch (err) {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: null
    });
  }
});

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

// handle deletions of public posts: deleting pending edits of deleted public posts
exports.deletePendingEditsOnPublicDeletion = functions.firestore
  .document(`${paths.publicPosts}{postId}`)
  .onDelete((snap, context) => {
    const data = snap.data();
    const id = data.id;
    db.doc(`${paths.pendingPosts}${id}`).delete();
});

// handle distribution of custom claims
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  const email = user.email;
  await isAuthorized(email);
  await setAdmin(email);
});

exports.onAdminDocCreation = functions.firestore
  .document(paths.adminDoc)
  .onCreate(async (snap, context) => {
    const value = snap.data();
    console.log(`doc creation: ${JSON.stringify(value)}`)
    Object.entries(value).forEach( async (ent, val) => {
      try {
        const email = ent[0];
        await setAdmin(email);
      } catch (err) {
        console.log(err);
      }
    });
  });

exports.onAdminDocChange = functions.firestore
  .document(paths.adminDoc)
  .onUpdate(async (change, context) => {
    const newValue = change.after.data();
    const previousValue = change.before.data();
    console.log(`admins list updated ${JSON.stringify(previousValue)} -> ${JSON.stringify(newValue)}`);
    await Object.entries(previousValue).forEach( async (ent, val) => {
      try {
        const email = ent[0];
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().setCustomUserClaims(user.uid, {
          admin: null
        });
      } catch (err) {
        console.log(err);
      }
    });
    await Object.entries(newValue).forEach( async (ent, val) => {
      try {
        const email = ent[0];
        const user = await setAdmin(email);
      } catch (err) {
        console.log(err);
      }
    });
  });
