const functions = require("firebase-functions");
const { db } = require("./util/admin");

// create notification based on like scream
exports.createNotificationOnLike = functions.firestore
  .document("likes/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            read: false,
            screamId: doc.id,
            type: "like",
            createdAt: new Date().toISOString(),
          });
        }
      })
      .catch((err) => {
        console.error(err);
      });
  });

// delete notification based on unlike scream
exports.deleteNotificationOnUnlike = functions.firestore
  .document("likes/{id}")
  .onDelete((snapshot) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
        return;
      });
  });

// create notification based on comment on scream
exports.createNotificationOnComment = functions.firestore
  .document("comments/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            read: false,
            screamId: doc.id,
            type: "comment",
            createdAt: new Date().toISOString(),
          });
        }
      })
      .catch((err) => {
        console.error(err);
      });
  });

// change user image in all user's screams
exports.onUserImageChange = functions.firestore
  .document("/users/{userId}")
  .onUpdate((change) => {
    console.log(change.before.data());
    console.log(change.after.data());
    if (
      change.before.data().imageUrl !== change.after.data().imageUrl
    ) {
      console.log("image has been changed");
      const batch = db.batch();
      return db
        .collection("screams")
        .where("userHandle", "==", change.before.data().handle)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const scream = db.doc(`/screams/${doc.id}`);
            batch.update(scream, {
              userImage: change.after.data().imageUrl,
            });
          });
          return batch.commit();
        });
    } else return true;
  });

// delete all notifications and comments and likes based on delete one scream
exports.onScreamDelete = functions.firestore
  .document("/screams/{screamId}")
  .onDelete((snapshot, context) => {
    console.log("context is >>>>", context);
    const screamId = context.params.screamId;
    const batch = db.batch();
    return db
      .collection("comments")
      .where("screamId", "==", screamId)
      .get()
      .then((data) => {
        data.forEach((doc) =>
          batch.delete(db.doc(`/comments/${doc.id}`))
        );
        return db
          .collection("likes")
          .where("screamId", "==", screamId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) =>
          batch.delete(db.doc(`/likes/${doc.id}`))
        );
        return db
          .collection("notifications")
          .where("screamId", "==", screamId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) =>
          batch.delete(db.doc(`/notifications/${doc.id}`))
        );
        return batch.commit();
      })
      .catch((err) => console.error(err));
  });
