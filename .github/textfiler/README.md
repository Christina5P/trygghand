# Trygg Hand

Live web site: https://trygghand.com/

## Table of Contents

- [About](#about)
- [Marketing research](#marketing-research) 
- [Agile method](#agile-method) 
  - [Concept Chart](#concept_chart)
  - [Buisness Model](#buisness_model)
  - [ERD](#erd)
  - [User Stories](#user-stories) 
- [wireframes](#wireframes)
- [UX](#ux)
- [Design](#design)
- [Media](#media)
- [Features](#features) 
  - [Existing Features](#existing-features)
  - [Future Features](#future-features)
- [CRUD](#crud)
- [Technologies Used](#technologies_used)
- [Setup](#setup)
- [Deployment](#deployment) 
- [Testing](#testing)
  - [Validation](#validation)
  - [Manual Testing](#manual_testing)
- [Bug Report](#bugreport)
- [Acknowledgements](#acknowledgements)

### [About](#about)

This is my website for my coming buisness of services to seniors and relatives.
The site is an informing site with transparent prices, so it makes it easy to make deicisions in a difficult or stressed time.
As customer, you can alson sign in and follow every step of your package of services. In the database, you can aslo make comment to send to the coordinator.
You have a chatbot as a premium seervice when you are logged in.
The project are build as a vite with react in typescript.
I use tailwind as styling.


### [Marketing research](#marketing-research) 

I started to make research to update me of this market and see what kind of competitor there is.

### [Agile method](#agile-method) 

I have brainstormed what I want to achieve and how to plan the project.


#### [Concept Chart](#concept_chart)


### [Buisness Model](#buisness_model)
The business operates on a B2C model (Buisness-to-Consumer) and revenue comes from the servicepackage I sell.

#### [ERD](#erd)


#### [User Stories](#user-stories)
I set up a project in Github with a canban. Link to canband: https://github.com/users/Christina5P/projects/10
This project is divided into:
- Milestones

  - EPICS


    - User stories

      - Tasks
      There could also be some tasks.


### [wireframes](#wireframes)  

I used loveable to get a basic webside, to build from.


### [UX](#ux)

My goal is to keep good UX principles regarding interaction/layout/colors/
 
* Users needs

###  [Design](#design) 

To design this website I proceeded from calm and confidence colours.

- Logotype is created to simulate caring services with your home 

-I have also made a "Satisfied customer" logo, generated from Gemini

- Colors: 
 

- Favicon
I use the same image for favicon 
I also load the favicon to work on different devices

- Font
 Nunitio

 The font is a part of Sans Serif family.
 It is easy to read and thats important for my target group
 

### [Media](#media)

Image and content used from media:

* https://smashinglogo.com/ - create my buisness logo
* https://gemini.google.com/ - create satisfied logo
* https://canva.com - create AI img to Frågor & Tips blog
* https://fontawesome.com/ -font awesome icons



## [Features](#features) 



### [Existing Features](#existing_featuers)


#### Home

You will be inviting to action in the Homepage and view easy navigation of your interest.

#### Category / search

####  Users account


<details><summary>Footer</summary>



#### [Future Features](#future_features)

##### Newsletters archive
Store newsletter in an archive on the website 
<hr>


### [CRUD](#crud)

-Create


-Read 

-Update
 

-Delete
### 💻 Technologies Used

Denna applikation är byggd med följande teknologier och verktyg:

#### Plattformer & Miljöer (Platforms & Environments)
* **GitHub:** Används för versionshantering, källkodslagring och samarbete.
* **VS Code:** (Visual Studio Code) Används som Integrated Development Environment (IDE) för utveckling.

#### Programmeringsspråk (Languages)
* **TypeScript:** Används för att skriva robust och skalbar kod, vilket är ett superset av JavaScript.
* **JavaScript (JS):** Huvudsakligt skriptspråk för både frontend och backend-logik.
* **HTML:** Används för att strukturera innehållet i applikationen.
* **CSS:** Används för att definiera stil och layout.

#### Ramverk & Bibliotek (Frameworks & Libraries)

* **Tailwind CSS:** Ett verktygsorienterat CSS-ramverk för snabb och flexibel design av användargränssnittet (UI).
* **Vent:** (Kategoriserat som ett frontend- eller utility-bibliotek/ramverk.) *


#### Databaser & Backend-tjänster (Databases & Backend Services)
* **Supabase:** Används som en molnbaserad backend-tjänst (BaaS), som inkluderar databas (PostgreSQL), autentisering och realtidsfunktioner.

### [Setup](#setup)

### [Deployment](#deployment) 

### [Testing](#testing)


#### [Validators](#validators)


 - Responsiveness and SEO in Lighthouse


#### [Manual Testing](manual_testing) 

### [Bug Report](#bugreport)

### [Acknowledgements](#acknowledgements)

[Go to Top](#TryggHand)


# Trygg Hand — utvecklingsrepo

Kortfattat
- Enkel React + Vite-app för Trygg Partner (lokala tjänster).
- Innehåller cookie‑banner, integritetssida, clearcookies‑ruta och ett server‑endpoint‑stub för att revokera Supabase‑sessioner.

Snabbstart (lokalt)
1. Installera beroenden:
   - npm install
2. Starta dev‑server:
   - npm run dev
3. Öppna i webbläsaren:
   - $BROWSER http://localhost:5173

Viktiga filer och rutter
- Frontend:
  - src/components/CookieBanner.tsx — cookie‑banner (visar/ sparar trygghand_cookie_consent)
  - src/pages/CookiePolicy.tsx — cookie‑policy
  - src/pages/GDPRinfo.tsx — integritetspolicy
  - src/pages/ClearCookies.tsx — rensa cookie i användarens webbläsare (/clearcookies)
- Server (server‑only):
  - src/api/revokeSessions.ts — endpoint‑stub för att ogiltigförklara Supabase‑sessioner (måste köras server‑side)

Miljövariabler (lägg i .env eller i din hosting)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE  (ANVÄND ENDAST PÅ SERVER, aldrig i frontend)
- REVOKE_API_KEY         (intern nyckel för skydd av revokeSessions endpoint)

Cookie / GDPR — kort
- Banner sparar val i cookie: `trygghand_cookie_consent` (persistent).  
- Statistik/analytics initieras bara efter samtycke (lyssnar på event "cookieConsentGiven").
- Supportflöde: be användare öppna `/clearcookies` för att radera cookien i deras webbläsare.
- För att tvinga utloggning/revocation: anropa server‑endpoint `/api/revokeSessions` med POST { userId } och header `x-revoke-key: <REVOKE_API_KEY>`. Endpointen måste skyddas och köras server‑side.

Testa cookies i webbläsaren (Console → kör):
```javascript
console.log("document.cookie:", document.cookie);
console.log("LocalStorage keys:", Object.keys(localStorage));
```

Deployment
- Deploya frontend (Vercel/Netlify eller liknande). Se till att server‑endpoint (revokeSessions) ligger som serverless‑funktion eller backend med miljövariabler satta. SUPABASE_SERVICE_ROLE får aldrig exponeras i klientkod.

Säkerhet & drift
- Håll SUPABASE_SERVICE_ROLE och REVOKE_API_KEY hemliga.  
- Granska och teckna DPA med Supabase via deras support om ni behandlar personuppgifter. Dokumentera rutiner för registerförfrågningar.

Vanliga kommandon
- npm run dev — starta utveckling
- npm run build — bygg produktion
- npm run preview — förhandsgranska build

