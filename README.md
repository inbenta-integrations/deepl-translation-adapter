# DEEPL CHATBOT ADAPTER
 
## TABLE OF CONTENTS
* [Description](#description)
* [Functionalities](#functionalities)
* [Installation](#installation)
* [Configuration](#configuration)
    * [Middleware](#middleware)
    * [DeepL Adapter](#deepl-adapter)
* [Example](#example)
* [Dependencies](#dependencies)
 
## DESCRIPTION
This adapter makes a translation of the Chatbot responses (from original languange to the selected languange) and the user responses (from selected language to original languange), all this process in real time using DeepL service. This also applies for the agent conversation, (Hyperchat Inbenta chat product).

You can find a configurated and functional **example of this adapter** in `./example/index.html`.

## INSTALLATION

In order to add this adapter to your SDK, you need to import the files `/src/deepl_adapter.js` into your HTML/JS file where you're building the SDK. Then, append it to the SDK adapters array providing the adapter configuration as shown in the [example](#example) section.

More information on how to integrate Inbenta adapters [here](https://developers.inbenta.io/chatbot/javascript-sdk/sdk-adapters).

Also, you will need to install the middleware (a PHP App contained in folder `middleware`) in a public server . This will execute the requests that contain sensitive information to DeepL.

## CONFIGURATION

This section contains the configuration of 2 components:
* Middleware
* DeepL Adapter

### Middleware

To execute all the translations you'll need a middleware Application. This project is included in **middleware** folder, with a PHP application with all the needed logic.

You'll have to add the information in the configuration file **.env** (**.envExample** file should be renamed to **.env**):

* `DEEPL_URL`: Deepl API url.
* `AUTH_KEY`: DeepL authorization key.
* `TOKEN`: Customer defined value, should be the same value added in `/src/deepl_adapter.js` file (`middlewareToken` variable).

This PHP uses these composer dependencies:

* `guzzlehttp/guzzle`
* `vlucas/phpdotenv`
 
### DeepL Adapter

Below is the necessary configuration for the adapter and the definition of the different properties:

```javascript
let deeplConf = {
    middlewareUrl: "", // Url of the middleware
    middlewareToken: "", // Customer defined, same as env in middleware
};
```

* `middlewareUrl`(string): Middleware URL used to execute the translations.
* `middlewareToken`(string): Customer defined value (same as env in middleware) to add an extra security layer.

## EXAMPLE

As commented before, there is an example in `./example/index.html`. To make it work, you will need add the ```inbentaKey``` and ```domainKey``` of your Chatbot instance.

Additionally, the values in `/src/deepl_adapter.js` are mandatory in order to have the translation working properly. See the needed values in addapter [here](#deepl-adapter)


## DEPENDENCIES

This adapter has been developed using Chatbot SDK version **1.69.2**.
