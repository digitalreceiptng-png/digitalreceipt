DIGITAL RECEIPT — NEW ANDROID UPLOAD KEYSTORE
===============================================

KEEP THIS FILE PRIVATE. Copy these values into a password manager, then delete this file.
This keystore is now the ONLY way to publish future updates to this app on Google Play.
If it's lost again, you'll have to repeat Google's key-reset process.

Keystore file: upload-keystore.jks
Keystore type: PKCS12
Alias: digitalreceipt-upload
Keystore password: 41O6mqxLXl9Yasy7OSCroxOQ
Key password: 41O6mqxLXl9Yasy7OSCroxOQ   (same as keystore password — PKCS12 keystores use one password for both)

What to do next:
1. In Google Play Console, open your app > Protected with Play > Play Store protection > Manage Play app signing.
2. Under 'Upload key certificate', choose 'Request upload key reset'.
3. Upload upload_certificate.pem, explain the original upload key was lost, and submit.
4. Once Google approves the reset (check email / Play Console notifications), from apps/mobile run:
     eas credentials
   Choose Android > production > Keystore > 'Set up a new keystore' > 'I want to upload my own file'
   and point it at upload-keystore.jks, entering the password above when prompted.
5. Re-run:
     eas build --platform android --profile production
   It will now sign with this key, matching what Google Play expects going forward.

Certificate fingerprint (for reference, also visible in upload_certificate.pem):
SHA1: 89:7E:AB:D1:74:42:26:44:25:0D:77:08:A3:37:F2:93:94:96:0A:D4
