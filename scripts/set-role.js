// Run with Google Application Default Credentials.
// Usage: node scripts/set-role.js person@example.com admin|gate
const admin=require("firebase-admin");
const [email,role]=process.argv.slice(2);
if(!email||!["admin","gate"].includes(role)){console.error("Usage: node scripts/set-role.js <email> <admin|gate>");process.exit(1);}
admin.initializeApp({projectId:process.env.GCLOUD_PROJECT||process.env.FIREBASE_PROJECT_ID});
(async()=>{const u=await admin.auth().getUserByEmail(email);const claims={...(u.customClaims||{}),[role]:true};if(role==="admin")delete claims.gate;await admin.auth().setCustomUserClaims(u.uid,claims);console.log(`Assigned ${role} to ${email}; sign out/in to refresh token.`);process.exit(0);})().catch(e=>{console.error(e);process.exit(1);});