# Setting up the MENVA autoposter

When you finish, a small free server posts one MENVA Instagram post, plus a Story that points to it, at **8:30 pm Pakistan time** on 5 days a week for 300 days (during Ramadan, some posts go out at 4:30 pm, before iftar; nothing posts on Ashura). You don't need to approve or touch anything. You get a phone alert if something goes wrong.

**Time needed:** about 1 hour, once.
**Cost:** PKR 0 a month. Oracle's "Always Free" server is free. Captions are already written, so there is no AI bill. A domain is optional.

**What you need before you start**
- The MENVA Instagram account, and its password.
- A debit or credit card. Oracle uses it to check you're a real person. It won't charge you for Always Free.
- A computer (Windows or Mac) and your phone.
- Your GitHub login (gamenailer0-oss).

You'll copy a few passwords and codes along the way. Keep them in a note or a password manager as you go.

---

## Step 1: Make the Instagram account a Business account (2 min)

On your phone, in the Instagram app:
1. Go to **Profile → ☰ (menu) → Settings and privacy → Account type and tools → Switch to professional account**.
2. Choose a category (for example **Software** or **Product/service**), then choose **Business**.
3. If you're asked to connect a Facebook Page, you can **skip** it. You don't need one.

## Step 2: Create the free server on Oracle Cloud (15–20 min)

1. Go to **cloud.oracle.com** and click **Sign up**.
   - **Home region:** pick one near Pakistan, such as **India West (Mumbai)**, **India South (Hyderabad)** or **UAE East (Dubai)**. You **can't change this later**, and free servers are only created in your home region.
   - Enter your card when asked. It's only a check.
2. After you sign in, click **☰ (top left) → Compute → Instances → Create instance**.
3. **Name:** `menva-social`.
4. **Image and shape → Edit:**
   - **Change image → Ubuntu → Canonical Ubuntu 24.04** → Select image.
   - **Change shape → Ampere → VM.Standard.A1.Flex**. Set **OCPUs: 1** and **Memory: 6 GB** → Select shape. It should say **"Always Free-eligible"**.
5. **Networking:** leave the defaults ("Create new virtual cloud network", "Create new public subnet"). Make sure **Assign a public IPv4 address** is ticked.
6. **Add SSH keys:** choose **Generate a key pair for me**, then click **Save private key**. A file called something like `ssh-key-2026-10-01.key` downloads. **Keep it safe.** It's the only key to your server.
7. Click **Create**. After about a minute the status turns green (**Running**).
   - If you get **"Out of capacity"**, it's common. Try a different **Availability domain** (under Placement) or try again in a few hours.
8. On the instance page, copy the **Public IP address** (for example `140.238.10.20`). You'll use it several times below.

**Open the web ports (Oracle blocks them by default):**
1. On the instance page, under **Primary VNIC**, click the **Subnet** link.
2. Click **Security Lists → Default Security List → Add Ingress Rules**.
3. Fill in **Source CIDR** `0.0.0.0/0`, **IP Protocol** `TCP`, **Destination Port Range** `80,443`. Click **Add Ingress Rules**.

**Keep the server from being switched off (recommended):** Oracle can reclaim Always Free servers that sit idle, and this one is idle most of the day. To avoid that, go to **☰ → Billing & Cost Management → Upgrade and manage payment** and upgrade to **Pay As You Go**. You still pay nothing while you stay inside the Always Free limits (1 OCPU and 6 GB is well inside them), and idle reclamation no longer applies.

## Step 3: Choose the server's web address (2 min)

Pick **one**:
- **A) Free, nothing to set up:** your address is your IP with dashes plus `.sslip.io`. For IP `140.238.10.20` that's **`140-238-10-20.sslip.io`**. The installer suggests it for you.
- **B) Your own domain:** at the company where you bought your `.net` domain, open **DNS settings** and add a record: **Type** `A`, **Name/Host** `social`, **Value** your server IP. Your address is then **`social.yourdomain.net`**. It can take up to an hour to start working.

## Step 4: A GitHub key so the server can download MENVA's files (3 min)

The repository is private, so the server needs a read-only key.
1. On github.com, click your photo → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. **Name:** `menva-social-server`. **Expiration:** 1 year.
3. **Repository access:** *Only select repositories* → **menva-mvp**.
4. **Permissions → Repository permissions → Contents: Read-only**.
5. Click **Generate token** and copy it (it starts with `github_pat_`).

## Step 5: Connect to the server and install (10 min)

**Open a terminal on your computer:**
- **Mac:** open the **Terminal** app.
- **Windows:** open **PowerShell** from the Start menu.

**Connect.** Change the file name and IP to yours:
```
ssh -i ~/Downloads/ssh-key-2026-10-01.key ubuntu@140.238.10.20
```
- **Mac only:** if it says the key's "permissions are too open", run `chmod 600 ~/Downloads/ssh-key-2026-10-01.key` first, then try again.
- If it asks "Are you sure you want to continue connecting?", type `yes`.
- You're in when the line starts with `ubuntu@menva-social`.

**Download MENVA and run the installer.** Paste these lines one at a time:
```
git config --global credential.helper store
git clone -b social-automation https://github.com/gamenailer0-oss/menva-mvp.git
```
When it asks: **Username** `gamenailer0-oss`. **Password** paste the GitHub token from step 4. The characters don't show while you paste; that's normal. Press Enter.

```
cd menva-mvp/social/server
./install.sh
```
The installer asks for:
- **Address:** press Enter to accept the sslip.io address, or type your own from step 3.
- **Your email:** used only for the free HTTPS certificate.
- **An n8n login:** an email and a password (8+ characters, with a number and a capital letter). Save it in your password manager. The installer creates the account itself, so nobody else can claim the dashboard first.

It takes about 5 minutes. When it prints **Done.**, open **https://your-address** in your browser and sign in with that login.

**Then turn on two-factor login** (strongly recommended: the dashboard is on the internet and holds the Instagram key). In n8n, click your initials (bottom left) → **Settings → Personal → Enable 2FA**, and scan the code with an authenticator app.

## Step 6: Get the Instagram key (15 min)

This lets the server post to your account. Meta changes these screens often, so the wording may be slightly different.

1. Go to **developers.facebook.com** and log in with Facebook. If asked, register as a developer (it's free).
2. **My Apps → Create app**.
   - **App name:** `MENVA Autopost`. Add your email. → Next.
   - **Use case:** choose **Manage messaging & content on Instagram** → Next.
   - **Business:** choose *I don't want to connect a business portfolio yet* → Next → **Create app**.
3. In the app dashboard, open **Use cases → Manage messaging & content on Instagram → Customize** (or **API setup with Instagram login**).
4. Under **Permissions**, make sure **instagram_business_basic** and **instagram_business_content_publish** are listed (click **Add** next to them if they're not).
5. Under **Generate access tokens**, click **Add account** and log in to the **MENVA Instagram account**. Allow everything it asks.
   - If it says the account must be a tester: go to **App roles → Roles → Add People → Instagram Tester**, enter the MENVA username, then in the Instagram app go to **Settings → Website permissions → Apps and websites → Tester invites → Accept**. Then try *Add account* again.
6. Next to the account, you'll see:
   - an **ID** (a long number): this is your **IG_USER_ID**.
   - a **Generate token** button. Click it, tick the box, and copy the token (a long string starting with `IG`): this is your **IG_ACCESS_TOKEN**.
7. Leave the app in **Development** mode. That's fine for posting to your own account, and there's no App Review.

**Put them on the server.** In the terminal (still connected, inside `menva-mvp/social/server`):
```
nano .env
```
Use the arrow keys to fill in these lines:
```
IG_ACCESS_TOKEN=IGAA...your token...
IG_USER_ID=1784...your id...
IG_HANDLE=@yourhandle
```
Save: press **Ctrl+O**, then **Enter**, then **Ctrl+X**. Then apply it:
```
sudo docker compose up -d
```
The token lasts 60 days, and the server renews it every week by itself. You only repeat this step if an alert tells you the token has expired.

## Step 7: Phone alerts (3 min, recommended)

1. Install the free **ntfy** app (App Store or Play Store).
2. Make up a long, private topic name, for example `menva-k3v9q2x7p`. **Subscribe to topic** with that name in the app.
3. On the server, run `nano .env`, set `NTFY_TOPIC=menva-k3v9q2x7p`, save, then run `sudo docker compose up -d`.

You'll get a notification each time a post goes out, and one if anything fails.

## Step 8: Test it without posting (5 min)

`.env` starts with `DRY_RUN=true`, which means "make the images, don't post".
1. Open **https://your-address**, log in, and open the workflow **MENVA – Instagram autopost**.
2. Hover over the box **Run now (test)** and click its **▶** button (or click **Execute workflow** at the bottom and pick *Run now (test)*). It builds the next post in the calendar.
3. Click the last box, **Publish to Instagram**. In its output you'll see `images` with links. Open them: they're the exact images that will be posted. You also get a phone alert with the link if you did step 7.

If a box turns red, click it to read the message, and see *If something goes wrong* below.

## Step 9: Go live (1 min)

```
nano .env
```
- Set `DRY_RUN=false`.
- Set `START_DATE=` to the day post #1 should go out, for example `START_DATE=2026-10-05`. It should be a **Monday**, because the calendar is built on a Monday start (rest days are Monday and Wednesday after launch).
- Optional: `POST_TIME=20:30` is the posting time. Change it if you like.

- Optional: `STORIES=false` if you don't want the automatic Story teaser for each post.

Save, then run `sudo docker compose up -d`. You're done. From the start date on, it posts by itself at 8:30 pm on each posting day.

---

## Everyday use

| You want to… | Do this |
|---|---|
| See what's coming | Open `social/content/calendar.csv` on GitHub (branch `social-automation`), or open it in Excel or Google Sheets. |
| Pause posting | `nano .env` → `DRY_RUN=true` → `sudo docker compose up -d` |
| Change a post's text | Edit `social/content/calendar.json` on GitHub (branch `social-automation`) and commit. Then on the server: `cd ~/menva-mvp/social/server && ./update.sh` |
| See what was posted | `cat ~/menva-mvp/social/server/files/log/posts.csv`, or the **Executions** tab in n8n |
| Post one right now | You can't post early: a test run of a future post is always a dry run. That's on purpose, so the calendar can't get out of order. |
| Renew an expired token | Repeat step 6 (generate a token, paste it into `.env`, `sudo docker compose up -d`). |

Reconnecting later: `ssh -i ~/Downloads/<your key file> ubuntu@<your IP>`, then `cd menva-mvp/social/server`.

## If something goes wrong

| Alert or problem | What it means / what to do |
|---|---|
| **"Instagram token is expired or invalid"** | Repeat step 6. |
| **"Instagram could not process the image"** | Open the image link from the alert in your browser. If it doesn't open, the web address or ports aren't working: check step 2 *Open the web ports* and step 3. |
| **"START_DATE … is not a date"** | In `.env`, write it exactly like `2026-10-05`. |
| The n8n page doesn't open | Wait 2 minutes after install (the HTTPS certificate is being issued). Check the security list from step 2. With your own domain, check the DNS record from step 3. |
| A post failed | It retries by itself every 15 minutes, up to 3 times that evening, then gives up for the day and alerts you. The calendar carries on with the next post. |
| Anything else | Run `sudo docker compose logs --tail 50 n8n` and send the output to whoever helps you. |

## What's running (for the curious)

- **n8n** (`social/n8n/workflow.json`): checks every 15 minutes. At or after 8:30 pm on a posting day, it takes that day's post from `social/content/calendar.json`, asks Gotenberg to draw each slide, saves the JPEGs, and publishes them through Instagram's official API. It remembers what was posted, so nothing goes out twice.
- **Gotenberg**: a hidden Chrome that turns the post template (`social/templates/post.html`) into JPEG images, 1080×1350.
- **Caddy**: gives the n8n page its HTTPS padlock and serves the finished images to Instagram.
- All three are free, open-source, pinned to fixed versions, and run with Docker on your own server.
