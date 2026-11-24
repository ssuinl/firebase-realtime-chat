# Firebase 실시간 1:1 채팅

2026.08 | 개인 프로젝트

Firebase를 이용해 사용자 인증과 실시간 메시지 교환 기능을 구현한 웹 채팅 프로젝트입니다.

## 주요 기능

- Firebase Authentication을 이용한 회원 인증
- Cloud Firestore를 이용한 실시간 1:1 채팅
- 이미지 전송 (Cloudinary)

## 기술 스택

JavaScript, Firebase Authentication, Cloud Firestore, Cloudinary, Firebase Hosting

## 저장소 구성

`recovered/app.js`에는 당시 작성한 JavaScript 소스를 복구해 정리했습니다. Cloudinary 설정값은 공개용으로 대체했습니다.

HTML, CSS, Firebase 설정 파일, 접근 제어 규칙 및 배포 설정은 아직 복구하지 못했습니다. 따라서 현재 파일만으로 서비스를 실행할 수 없습니다. 당시 작업 기록에 있는 읽음 처리, 답장 및 모바일 화면 대응은 전체 원본 복구 후 다시 확인할 필요가 있습니다.

## 배포 및 보안

당시 Firebase Hosting에 배포했습니다. 현재 서비스의 작동 상태와 접근 권한은 확인하지 않았습니다.

실제 사용자 메시지나 사진은 저장소에 포함하지 않습니다. 외부 공개 전 인증 및 데이터 접근 규칙, 이미지 업로드 설정을 추가로 점검해야 합니다.
