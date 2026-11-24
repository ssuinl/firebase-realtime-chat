import { firebaseConfig } from "./firebase-config.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ===============================
// Firebase
// ===============================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ===============================
// Cloudinary
// ===============================

const CLOUDINARY_CLOUD_NAME = "YOUR_CLOUD_NAME";
const CLOUDINARY_UPLOAD_PRESET = "YOUR_UPLOAD_PRESET";


// ===============================
// DOM
// ===============================

const authPanel = document.getElementById("authPanel");
const chatApp = document.getElementById("chatApp");

const authForm = document.getElementById("authForm");
const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");

const nicknameWrap = document.getElementById("nicknameWrap");
const nicknameInput = document.getElementById("nicknameInput");

const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");

const authSubmitBtn = document.getElementById("authSubmitBtn");
const authMessage = document.getElementById("authMessage");

const logoutBtn = document.getElementById("logoutBtn");

const myNickname = document.getElementById("myNickname");
const myEmail = document.getElementById("myEmail");
const myAvatar = document.getElementById("myAvatar");

const friendEmailInput = document.getElementById("friendEmailInput");
const addFriendBtn = document.getElementById("addFriendBtn");
const friendMessage = document.getElementById("friendMessage");
const friendList = document.getElementById("friendList");

const emptyChat = document.getElementById("emptyChat");
const activeChat = document.getElementById("activeChat");

const chatFriendName = document.getElementById("chatFriendName");
const chatFriendEmail = document.getElementById("chatFriendEmail");
const chatAvatar = document.getElementById("chatAvatar");

const messagesEl = document.getElementById("messages");

const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");

const imageInput = document.getElementById("imageInput");
const imageBtn = document.getElementById("imageBtn");


// ===============================
// 상태
// ===============================

let authMode = "login";

let currentUserProfile = null;
let selectedFriend = null;

let unsubscribeFriends = null;
let unsubscribeMessages = null;

// ===============================
// 브라우저 알림
// ===============================

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    return;
  }

  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

function showMessageNotification(message) {
  if (!("Notification" in window)) {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  // 현재 탭을 보고 있을 때는 알림 생략
  if (!document.hidden) {
    return;
  }

  const title =
    selectedFriend?.nickname || "새 메시지";

  const body =
    message.type === "image"
      ? "📷 사진을 보냈습니다."
      : message.text || "새 메시지가 도착했습니다.";

  new Notification(title, {
    body,
    silent: true
  });
}

// ===============================
// 로그인 / 회원가입 탭
// ===============================

function setAuthMode(mode) {

  authMode = mode;

  const signup = mode === "signup";

  loginTab.classList.toggle("active", !signup);
  signupTab.classList.toggle("active", signup);

  nicknameWrap.classList.toggle("hidden", !signup);

  nicknameInput.required = signup;

  authSubmitBtn.textContent = signup
    ? "회원가입"
    : "로그인";

  authMessage.textContent = "";
}


loginTab.addEventListener("click", () => {
  setAuthMode("login");
});


signupTab.addEventListener("click", () => {
  setAuthMode("signup");
});


// ===============================
// 로그인 / 회원가입
// ===============================

authForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  authMessage.textContent = "";

  const email = emailInput.value
    .trim()
    .toLowerCase();

  const password = passwordInput.value;

  try {

    if (authMode === "signup") {

      const nickname = nicknameInput.value.trim();

      if (!nickname) {
        throw new Error("닉네임을 입력해 주세요.");
      }

      const credential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      await setDoc(
        doc(db, "users", credential.user.uid),
        {
          uid: credential.user.uid,
          email,
          nickname,
          emailLower: email,
          createdAt: serverTimestamp()
        }
      );

    } else {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
    }

  } catch (error) {

    console.error(error);

    authMessage.textContent =
      friendlyAuthError(error);
  }

});


// ===============================
// 로그아웃
// ===============================

logoutBtn.addEventListener("click", async () => {

  await signOut(auth);

});


// ===============================
// 로그인 오류 메시지
// ===============================

function friendlyAuthError(error) {

  const code = error?.code || "";

  if (code.includes("email-already-in-use")) {
    return "이미 가입된 이메일입니다.";
  }

  if (code.includes("invalid-email")) {
    return "이메일 형식을 확인해 주세요.";
  }

  if (code.includes("weak-password")) {
    return "비밀번호는 6자 이상으로 입력해 주세요.";
  }

  if (code.includes("invalid-credential")) {
    return "이메일 또는 비밀번호를 확인해 주세요.";
  }

  if (code.includes("operation-not-allowed")) {
    return "Firebase Authentication에서 이메일/비밀번호 로그인을 활성화해 주세요.";
  }

  return error?.message || "오류가 발생했습니다.";
}


// ===============================
// 로그인 상태 확인
// ===============================

onAuthStateChanged(auth, async (user) => {

  cleanupListeners();

  selectedFriend = null;

  friendList.innerHTML = "";

  emptyChat.classList.remove("hidden");
  activeChat.classList.add("hidden");

  if (!user) {

    currentUserProfile = null;

    chatApp.classList.add("hidden");
    authPanel.classList.remove("hidden");

    return;
  }

  const profileSnap =
    await getDoc(
      doc(db, "users", user.uid)
    );

  if (!profileSnap.exists()) {

    authMessage.textContent =
      "사용자 프로필을 찾을 수 없습니다.";

    await signOut(auth);

    return;
  }

  currentUserProfile =
    profileSnap.data();

  myNickname.textContent =
    currentUserProfile.nickname;

  myEmail.textContent =
    currentUserProfile.email;

  myAvatar.textContent =
    currentUserProfile.nickname?.charAt(0) || "나";

  authPanel.classList.add("hidden");
  chatApp.classList.remove("hidden");

  requestNotificationPermission();

  listenToFriends();

});


// ===============================
// 친구 추가
// ===============================

addFriendBtn.addEventListener(
  "click",
  addFriend
);


friendEmailInput.addEventListener(
  "keydown",
  (event) => {

    if (event.key === "Enter") {
      addFriend();
    }

  }
);


async function addFriend() {

  friendMessage.textContent = "";

  const email =
    friendEmailInput.value
      .trim()
      .toLowerCase();

  if (!email || !auth.currentUser) {
    return;
  }

  if (email === currentUserProfile.emailLower) {

    friendMessage.textContent =
      "내 계정은 친구로 추가할 수 없어요.";

    return;
  }

  try {

    const q = query(
      collection(db, "users"),
      where("emailLower", "==", email)
    );

    const snap = await getDocs(q);

    if (snap.empty) {

      friendMessage.textContent =
        "해당 이메일로 가입한 사용자를 찾지 못했어요.";

      return;
    }

    const friend =
      snap.docs[0].data();

    const myUid =
      auth.currentUser.uid;

    await Promise.all([

      setDoc(
        doc(
          db,
          "users",
          myUid,
          "friends",
          friend.uid
        ),
        {
          uid: friend.uid,
          email: friend.email,
          nickname: friend.nickname,
          addedAt: serverTimestamp()
        }
      ),

      setDoc(
        doc(
          db,
          "users",
          friend.uid,
          "friends",
          myUid
        ),
        {
          uid: myUid,
          email: currentUserProfile.email,
          nickname: currentUserProfile.nickname,
          addedAt: serverTimestamp()
        }
      )

    ]);

    friendEmailInput.value = "";

    friendMessage.textContent =
      `${friend.nickname}님을 친구로 추가했어요.`;

  } catch (error) {

    console.error(error);

    friendMessage.textContent =
      "친구 추가 중 오류가 발생했습니다.";
  }

}


// ===============================
// 친구 목록
// ===============================

function listenToFriends() {

  const myUid =
    auth.currentUser.uid;

  const friendsRef =
    collection(
      db,
      "users",
      myUid,
      "friends"
    );

  unsubscribeFriends =
    onSnapshot(
      friendsRef,
      (snapshot) => {

        friendList.innerHTML = "";

        if (snapshot.empty) {

          const empty =
            document.createElement("p");

          empty.style.cssText =
            "color:#8c95a8;font-size:12px;text-align:center;padding:18px 6px;";

          empty.textContent =
            "아직 친구가 없어요.";

          friendList.appendChild(empty);

          return;
        }

        snapshot.docs
          .map(doc => doc.data())

          .sort(
            (a, b) =>
              (a.nickname || "")
                .localeCompare(
                  b.nickname || "",
                  "ko"
                )
          )

          .forEach(friend => {

            const button =
              document.createElement("button");

            button.className = "friend";
            button.type = "button";
            button.dataset.uid = friend.uid;


            const avatar =
              document.createElement("div");

            avatar.className = "avatar";

            avatar.textContent =
              friend.nickname?.charAt(0) || "친";


            const copy =
              document.createElement("div");

            copy.className =
              "friend-copy";


            const name =
              document.createElement("strong");

            name.textContent =
              friend.nickname || "친구";


            const email =
              document.createElement("span");

            email.textContent =
              friend.email || "";


            copy.append(
              name,
              email
            );

            button.append(
              avatar,
              copy
            );


            button.addEventListener(
              "click",
              () => {
                selectFriend(
                  friend,
                  button
                );
              }
            );


            friendList.appendChild(
              button
            );

          });

      }
    );

}


// ===============================
// 채팅방 ID
// ===============================

function conversationId(
  uid1,
  uid2
) {

  return [uid1, uid2]
    .sort()
    .join("_");

}


// ===============================
// 친구 선택
// ===============================

function selectFriend(
  friend,
  button
) {

  selectedFriend = friend;

  document
    .querySelectorAll(".friend")
    .forEach(el => {

      el.classList.remove("active");

    });

  button.classList.add("active");

  chatFriendName.textContent =
    friend.nickname || "친구";

  chatFriendEmail.textContent =
    friend.email || "";

  chatAvatar.textContent =
    friend.nickname?.charAt(0) || "친";

  emptyChat.classList.add("hidden");

  activeChat.classList.remove("hidden");

  listenToMessages();

  messageInput.focus();

}


// ===============================
// 메시지 실시간 수신
// ===============================

function listenToMessages() {

  if (unsubscribeMessages) {
    unsubscribeMessages();
  }

  const myUid =
    auth.currentUser.uid;

  const roomId =
    conversationId(
      myUid,
      selectedFriend.uid
    );

  const messagesRef =
    collection(
      db,
      "conversations",
      roomId,
      "messages"
    );

  const q =
    query(
      messagesRef,
      orderBy(
        "createdAt",
        "asc"
      )
    );

  unsubscribeMessages =
    onSnapshot(
      q,
      (snapshot) => {

        snapshot.docChanges().forEach((change) => {

          if (change.type !== "added") {
            return;
          }

          const msg = change.doc.data();

          // 내가 보낸 메시지는 알림 제외
          if (msg.senderId === auth.currentUser.uid) {
            return;
          }

          showMessageNotification(msg);
        });

        messagesEl.innerHTML =
          '<div class="day-label">실시간 대화</div>';

        snapshot.forEach(
          docSnap => {

            const msg =
              docSnap.data();

            const mine =
              msg.senderId === myUid;


            const row =
              document.createElement("div");

            row.className =
              `message-row ${mine ? "mine" : ""}`;


            const bubble =
              document.createElement("div");

            bubble.className =
              "message-bubble";


            // ===============================
            // 이미지 메시지
            // ===============================

            if (
              msg.type === "image" &&
              msg.imageUrl
            ) {

              bubble.classList.add(
                "image-message"
              );

              const image =
                document.createElement("img");

              image.src =
                msg.imageUrl;

              image.alt =
                "전송한 사진";

              image.loading =
                "lazy";


              image.addEventListener(
                "click",
                () => {

                  window.open(
                    msg.imageUrl,
                    "_blank",
                    "noopener,noreferrer"
                  );

                }
              );


              bubble.appendChild(
                image
              );


            } else {

              // ===============================
              // 텍스트 메시지
              // ===============================

              bubble.textContent =
                msg.text || "";

            }


            const time =
              document.createElement("div");

            time.className =
              "message-time";

            time.textContent =
              formatTime(
                msg.createdAt
              );


            row.append(
              bubble,
              time
            );


            messagesEl.appendChild(
              row
            );

          }
        );


        messagesEl.scrollTop =
          messagesEl.scrollHeight;

      }
    );

}


// ===============================
// 텍스트 메시지 전송
// ===============================

messageForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const text =
      messageInput.value.trim();

    if (
      !text ||
      !selectedFriend ||
      !auth.currentUser
    ) {
      return;
    }

    const myUid =
      auth.currentUser.uid;

    const roomId =
      conversationId(
        myUid,
        selectedFriend.uid
      );

    messageInput.value = "";

    try {

      await setDoc(
        doc(
          db,
          "conversations",
          roomId
        ),
        {
          participantIds:
            [
              myUid,
              selectedFriend.uid
            ].sort(),

          updatedAt:
            serverTimestamp()
        },
        {
          merge: true
        }
      );


      await addDoc(
        collection(
          db,
          "conversations",
          roomId,
          "messages"
        ),
        {
          senderId: myUid,

          receiverId:
            selectedFriend.uid,

          type: "text",

          text,

          createdAt:
            serverTimestamp()
        }
      );

    } catch (error) {

      console.error(error);

      alert(
        "메시지를 보내지 못했습니다."
      );

    }

  }
);


// ===============================
// 사진 선택 버튼
// ===============================

imageBtn.addEventListener(
  "click",
  () => {

    if (!selectedFriend) {

      alert(
        "먼저 친구를 선택해 주세요."
      );

      return;
    }

    imageInput.click();

  }
);


// ===============================
// 사진 선택
// ===============================

imageInput.addEventListener(
  "change",
  async () => {

    const file =
      imageInput.files?.[0];

    if (!file) {
      return;
    }


    // 이미지인지 확인

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {

      alert(
        "이미지 파일만 선택할 수 있어요."
      );

      imageInput.value = "";

      return;
    }


    // 최대 8MB

    const maxSize =
      8 * 1024 * 1024;

    if (
      file.size > maxSize
    ) {

      alert(
        "이미지는 8MB 이하만 전송할 수 있어요."
      );

      imageInput.value = "";

      return;
    }


    if (
      !selectedFriend ||
      !auth.currentUser
    ) {

      alert(
        "먼저 친구를 선택해 주세요."
      );

      imageInput.value = "";

      return;
    }


    imageBtn.disabled = true;

    imageBtn.textContent = "…";


    try {

      const imageUrl =
        await uploadImageToCloudinary(
          file
        );

      await sendImageMessage(
        imageUrl
      );

    } catch (error) {

      console.error(error);

      alert(
        "사진을 보내지 못했습니다. Cloudinary 설정을 확인해 주세요."
      );

    } finally {

      imageBtn.disabled = false;

      imageBtn.textContent = "📷";

      imageInput.value = "";

    }

  }
);

// ===============================
// 클립보드 이미지 붙여넣기
// Ctrl + V
// ===============================

document.addEventListener("paste", async (event) => {

  // 친구를 선택하지 않은 상태에서는 전송하지 않음
  if (!selectedFriend || !auth.currentUser) {
    return;
  }

  const items = event.clipboardData?.items;

  if (!items) {
    return;
  }

  let imageFile = null;


  // 클립보드 안에서 이미지 찾기
  for (const item of items) {

    if (item.type.startsWith("image/")) {

      imageFile = item.getAsFile();

      break;
    }

  }


  // 이미지가 없으면 일반 텍스트 붙여넣기로 처리
  if (!imageFile) {
    return;
  }


  // 이미지가 붙여넣어진 경우 기본 동작 방지
  event.preventDefault();


  // 최대 8MB
  const maxSize = 8 * 1024 * 1024;

  if (imageFile.size > maxSize) {

    alert("이미지는 8MB 이하만 전송할 수 있어요.");

    return;
  }


  // 실수로 보내는 것 방지
  const sendConfirm =
    confirm("붙여넣은 이미지를 전송할까요?");

  if (!sendConfirm) {
    return;
  }


  imageBtn.disabled = true;

  imageBtn.textContent = "…";


  try {

    // Cloudinary에 이미지 업로드
    const imageUrl =
      await uploadImageToCloudinary(
        imageFile
      );


    // Firebase 채팅으로 이미지 URL 전송
    await sendImageMessage(
      imageUrl
    );


  } catch (error) {

    console.error(error);

    alert(
      "붙여넣은 이미지를 보내지 못했습니다."
    );


  } finally {

    imageBtn.disabled = false;

    imageBtn.textContent = "📷";

  }

});

// ===============================
// Cloudinary 업로드
// ===============================

async function uploadImageToCloudinary(
  file
) {

  const formData =
    new FormData();

  formData.append(
    "file",
    file
  );

  formData.append(
    "upload_preset",
    CLOUDINARY_UPLOAD_PRESET
  );


  const response =
    await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData
      }
    );


  if (!response.ok) {

    const errorText =
      await response.text();

    throw new Error(
      `Cloudinary upload failed: ${errorText}`
    );

  }


  const result =
    await response.json();


  if (!result.secure_url) {

    throw new Error(
      "Cloudinary 이미지 URL을 받지 못했습니다."
    );

  }


  return result.secure_url;

}


// ===============================
// 이미지 메시지 Firestore 전송
// ===============================

async function sendImageMessage(
  imageUrl
) {

  const myUid =
    auth.currentUser.uid;

  const roomId =
    conversationId(
      myUid,
      selectedFriend.uid
    );


  await setDoc(
    doc(
      db,
      "conversations",
      roomId
    ),
    {

      participantIds:
        [
          myUid,
          selectedFriend.uid
        ].sort(),

      updatedAt:
        serverTimestamp()

    },
    {
      merge: true
    }
  );


  await addDoc(
    collection(
      db,
      "conversations",
      roomId,
      "messages"
    ),
    {

      senderId:
        myUid,

      receiverId:
        selectedFriend.uid,

      type:
        "image",

      imageUrl,

      createdAt:
        serverTimestamp()

    }
  );

}


// ===============================
// 시간
// ===============================

function formatTime(
  timestamp
) {

  if (
    !timestamp?.toDate
  ) {

    return "전송 중";

  }


  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      hour: "numeric",
      minute: "2-digit"
    }
  ).format(
    timestamp.toDate()
  );

}


// ===============================
// Listener 정리
// ===============================

function cleanupListeners() {

  if (unsubscribeFriends) {
    unsubscribeFriends();
  }

  if (unsubscribeMessages) {
    unsubscribeMessages();
  }

  unsubscribeFriends = null;
  unsubscribeMessages = null;

}