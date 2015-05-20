# StealthMode

##What is Stealth Mode?

Stealth Mode is a browser extension to stop all kinds of online trackers from receiving any information about you and your actions on the Internet.

##Why do you need Stealth Mode?

When you surf the web, a whole bunch of different companies track your actions, such as clicking, entering text or even hovering the mouse over something,  in order to get information about your preferences, personal tastes etc. Stealth Mode serves to protect your internet privacy. It hides your personal data and doesn't allow these companies to collect information about your actions on the web.

##How it works?

Stealth Mode fulfils multiple tasks targeted at hiding your private information. 

In particular:

- Stealth Mode uses Adguard's Spyware filter (http://adguard.com/en/filters.html#privacy) to block online trackers. 
Its database contains over 5000 different trackers and is regularly updated;

- Hides your Referrer from third-parties. It means current website won't know what site did you come there from;

- Blocks third-party cookies (small text files containing various information). Without Stealth Mode cookies are stored by browser and are often used by websites;

- Disables cache for third-party requests. Otherwise, so-called ETags are sent on any new request to the previously visited websites;

- Removes X-Client-Data header from HTTP requests. This is a special header included by Google Chrome to identify your browser in all requests sent to Google domains, such as google analytics;

- Hides your User-Agent. It replaces your User-Agent with a generic one, and the OS is always replaced with Linux as *nix users are rarely targeted by advertisers;

- Hides your IP address. Stealth Mode can't completely hide it, but will disguise you so that the website you visit will consider you a proxy server.

##Why is it better?

The major difference between Stealth Mode and popular blockers like ABP, Adguard, Ghostery and others, is that it takes a completely different approach to achieveing online privacy. It doesn't physically block all the trackers. Instead, Stealth Mode simply prevents them from collecting any information. This turns into an advantage, because since all cookies and ETags are being blocked, even if a tracker has not been added to the database yet, it still won't be able to get any information, making Stealth Mode a more reliable solution. 

On top of that, Stealth Mode is transparent and safe to use. No data at all is stored or used on our side, and the product itself is open source: https://github.com/AdguardTeam/StealthMode 
