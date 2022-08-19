// DeepL Adapter conf
let deeplConf = {
    middlewareUrl: "", // Url of the middleware
    middlewareToken: "" // Same as middleware
};

let langListHtml = '';
let langList = {
    en: 'English',
    es: 'Spanish',
    pt: 'Portuguese',
    fr: 'French'
};
for (var [key, value] of Object.entries(langList)) {
    langListHtml += '<option value="' + key + '">' + value + '</option>';
}

let laguageUserDefault = '';
let languageBrowser = window.navigator.userLanguage || window.navigator.language;
if (languageBrowser !== null) {
    if (languageBrowser.indexOf('-') === 2) {
        let laguageUserDefaultTmp = languageBrowser.split('-')[0];
        laguageUserDefault = langList[laguageUserDefaultTmp] !== undefined ? laguageUserDefaultTmp.toUpperCase() : laguageUserDefault;
    }
}

let sessionDetails = {
    id : '',
    botLanguage: 'EN',
    userLanguage: laguageUserDefault
};

if (localStorage.getItem('sessionDeepl') === null || localStorage.getItem('sessionDeepl') === '') {
    localStorage.setItem('sessionDeepl', JSON.stringify(sessionDetails));
}

let formQuestion = false;
let linksList = [];
let iframeList = [];
let queueMessages = [];
let messageNumber = 0;
let inputText;

/*
 * DeepL adapter
 */
var inbentaDeeplAdapter = function(chatbot) {

    function setSessionId(sessionId) {
        sessionDetails.id = sessionId;
        localStorage.setItem('sessionDeepl', JSON.stringify(sessionDetails));
    }

    function setUserLang() {
        localStorage.setItem('sessionDeepl', JSON.stringify(sessionDetails));
    }

    /**
     * Translate
     */
    function deeplTranslate(text, botOrUser) {
        let targetLang = botOrUser === 'bot' ? sessionDetails.userLanguage : sessionDetails.botLanguage;
        let sourceLang = botOrUser === 'user' ? sessionDetails.userLanguage : sessionDetails.botLanguage;
        let requestOptions = {
            method: 'POST',
            body: JSON.stringify({
                text: text.trim(),
                target_lang: targetLang,
                source_lang: sourceLang,
                token: deeplConf.middlewareToken
            })
        };

        return fetch(deeplConf.middlewareUrl, requestOptions)
        .then(response => response.json())
        .then(result => {
            if (result.success !== undefined && !result.success) {
                //On error set the user language as the bot language and return the original text
                sessionDetails.userLanguage = sessionDetails.botLanguage;
                setUserLang();
                return text;
            }
            if (botOrUser === 'user' && sessionDetails.userLanguage === '') {
                sessionDetails.userLanguage = result.translations[0].detected_source_language;
                setUserLang();
                document.getElementsByClassName('lang-selector')[0].value = sessionDetails.userLanguage.toLowerCase();
            }
            return result.translations[0].text;
        })
        .catch(error => console.log('error', error));
    }

    function checkHtmlTags(text) {
        text = text.replaceAll('&nbsp;', ' ');
        text = text.replace(/\sstyle=["\'][A-Za-z0-9-:\s.;#]{1,}["\']/gi, "");
        text = text.replace(/\sclass=["\'][A-Za-z0-9-:\s.;#]{1,}["\']/gi, "");

        var links = text.match(/<a[^>]*>(.*?)<\/a>/g);
        if (links && links.length > 0) {
            for(let i=0; i < links.length; i++) {
                var linkReplacement = '$L1$ ' + links[i].replace(/(<([^>]+)>)/gi, "") + ' $L2$';
                text = text.replace(links[i], linkReplacement);

                var div = document.createElement('div');
                div.innerHTML = links[i];
                linksList.push(div.firstChild.getAttribute("href"));
            }
        }
        var iframe = text.match(/<iframe[^>]*>(.*?)<\/iframe>/g);
        if (iframe && iframe.length > 0) {
            for(let i=0; i < iframe.length; i++) {
                var iframeReplacement = '$iF$';
                text = text.replace(iframe[i], iframeReplacement);
                iframeList.push(iframe[i]);
            }
        }
        return text;
    }

    /**
     * 
     * @param {*} messageData 
     */
    function splitChatbotResponse(messageData) {
        formQuestion = false;
        let response = {
            textMessage: '',
            elements: []
        };
        let countMessage = 0;
        if (messageData.message !== '') {
            response.textMessage = checkHtmlTags(messageData.message) + ' @@ ';
            response.elements[countMessage] = 'message';
            countMessage++;
        }
        if (messageData.options !== undefined && messageData.options !== null && messageData.options.length > 0) {
            for (let i = 0; i < messageData.options.length; i++) {
                response.textMessage += messageData.options[i].label + ' ___ ';
            }
            response.textMessage += ' @@ ';
            response.elements[countMessage] = 'options';
            countMessage++;
        }
        if (messageData.actionField !== undefined && messageData.actionField !== null) {
            if (messageData.actionField.listValues !== undefined && messageData.actionField.listValues.values !== undefined && messageData.actionField.listValues.values.length > 0) {
                for (let i = 0; i < messageData.actionField.listValues.values.length; i++) {
                    response.textMessage += messageData.actionField.listValues.values[i].label[0] + ' ___ ';
                }
                response.textMessage += ' @@ ';
                response.elements[countMessage] = 'listValues';
                countMessage++;
            }
            if (messageData.actionField.variableName !== undefined && messageData.actionField.variableName !== '') {
                formQuestion = true;
            }
        }
        if (messageData.subAnswers !== undefined && messageData.subAnswers !== null && messageData.subAnswers.length > 0) {
            for (let i = 0; i < messageData.subAnswers.length; i++) {
                response.textMessage += messageData.subAnswers[i].message + ' ___ ';
            }
            response.textMessage += ' @@ ';
            response.elements[countMessage] = 'subAnswers';
            countMessage++;
        }
        if (messageData.parameters !== undefined && messageData.parameters !== null && messageData.parameters.contents !== null
            && messageData.parameters.contents.related !== undefined && messageData.parameters.contents.related.relatedContents !== undefined
            && messageData.parameters.contents.related.relatedContents.length > 0) {
            for (let i = 0; i < messageData.parameters.contents.related.relatedContents.length; i++) {
                response.textMessage += messageData.parameters.contents.related.relatedContents[i].title + ' ___ ';
            }
            response.textMessage += ' @@ ';
            response.elements[countMessage] = 'relatedContents';
            countMessage++;
        }
        return response;
    }


    function processLinksFromResponse(text) {
        if (linksList.length > 0) {
            for(let i=0; i < linksList.length; i++) {
                text = text.replace('$L1$ ', '<a href="'+linksList[i]+'">');
                text = text.replace(' $L2$', '</a>');
                linksList.shift();
            }
        }
        if (iframeList.length > 0) {
            for(let i=0; i < iframeList.length; i++) {
                text = text.replace('$iF$', iframeList[i]);
                iframeList.shift();
            }
        }
        return text;
    }


    /**
     * Validate if the response is or not simple text
     * @param {*} text 
     * @param {*} parser 
     * @returns 
     */
     function validateTranslatedResponse(text, elements, messageData) {
        let textSplitted = text.split('@@');
        elements.forEach(function(value, index) {
            if (value === 'message') {
                messageData.message = processLinksFromResponse(textSplitted[index].trim());
            } else if (value === 'options') {
                let options = textSplitted[index].trim().split('___');
                messageData.options.forEach(function(option, optKey) {
                    messageData.options[optKey].label = options[optKey].trim();
                });
            } else if (value === 'listValues') {
                let options = textSplitted[index].trim().split('___');
                messageData.actionField.listValues.values.forEach(function(option, optKey) {
                    messageData.actionField.listValues.values[optKey].label[0] = options[optKey].trim();
                });
            } else if (value === 'subAnswers') {
                let options = textSplitted[index].trim().split('___');
                messageData.subAnswers.forEach(function(option, optKey) {
                    messageData.subAnswers[optKey].message = options[optKey].trim();
                });
            }
            else if (value === 'relatedContents') {
                let options = textSplitted[index].trim().split('___');
                messageData.parameters.contents.related.relatedContents.forEach(function(option, optKey) {
                    messageData.parameters.contents.related.relatedContents[optKey].title = options[optKey].trim();
                });
            }
        });
        return messageData;
    }

    /**
     * Translate all the queued messages
     * @param {int} index 
     */
    function translateQueuedMessages(index) {
        deeplTranslate(queueMessages[index].parsedChatbotResponse.textMessage, 'bot').then(function(result) {
            messageData = validateTranslatedResponse(result, queueMessages[index].parsedChatbotResponse.elements, queueMessages[index].messageData);

            if (queueMessages[index].type === 'sidebubble') {
                let splitted = result.split('@@');
                messageData.sideWindowContent = splitted[0].trim();
                messageData.sideWindowTitle = splitted[1].trim();
            }
            queueMessages[index].next(messageData);
            if (queueMessages.length > index + 1) {
                translateQueuedMessages(index + 1);
            }
        });
    }

    //Event listener function for input
    function eventListenerFunction(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            let textMessage = inputText.value;
            inputText.value = '';
            document.getElementsByClassName("inbenta-bot-input")[0].value = '';
            let hyperchatSessionId = localStorage.getItem('hyperchatSessionId');
            messageNumber = 0;
            queueMessages = [];
            if (sessionDetails.botLanguage !== sessionDetails.userLanguage && textMessage !== '') {
                deeplTranslate(textMessage, 'user').then(function(result) {
                    let messageSentId = chatbot.actions.displayUserMessage({message: textMessage});

                    ICF.Lobby.chats[hyperchatSessionId].sendMessage(result)
                    .then((msg) => {
                        let payload = {
                            id: messageSentId,
                            action: 'DOUBLE_TICK'
                        }
                        chatbot.actions.updateMessage(payload);
                    })
                    .catch((err) => {
                        console.log('Some error occurred', err);
                    });
                });
            }
        }
    }

    //Create the event listener for the input
    function createEventListenerForHyperchat() {
        document.getElementsByClassName("footer__form__button")[0].style.visibility = "hidden";
        inputText.addEventListener("keydown", eventListenerFunction);
    }

    function eventListenerForSelector() {
        document.getElementsByClassName('lang-selector')[0].onchange = function() {
            sessionDetails.userLanguage = this.value.toUpperCase();
            setUserLang();
        }
    }


    /************* CHATBOT SUBSCRIPTIONS ***********************/

    //Chatbot response
    chatbot.subscriptions.onDisplayChatbotMessage(function(messageData, next) {
        let sessionDeeplTmp = JSON.parse(localStorage.getItem('sessionDeepl'));
        if (sessionDetails.botLanguage !== sessionDetails.userLanguage && sessionDeeplTmp.userLanguage !== '' && sessionDetails.id !== '') {
            let parsedChatbotResponse = splitChatbotResponse(messageData);
            if (parsedChatbotResponse.textMessage !== '') {

                queueMessages[messageNumber] = {
                    next: next,
                    messageData: messageData,
                    parsedChatbotResponse: parsedChatbotResponse,
                    type: 'normal'
                };
                if (messageData.user !== undefined) {
                    translateQueuedMessages(0);
                } else {
                    if (messageNumber === 0) {
                        setTimeout(()=> {
                            translateQueuedMessages(0);
                        }, 500);
                    }
                    messageNumber++;
                }
            } else {
                return next(messageData);
            }
        } else {
            return next(messageData);
        }
    });

    //Translate the sidebubble content and title
    chatbot.subscriptions.onShowSideWindow(function(sideWindowData, next) {
        let sessionDeeplTmp = JSON.parse(localStorage.getItem('sessionDeepl'));
        if (sessionDetails.botLanguage !== sessionDetails.userLanguage && sessionDeeplTmp.userLanguage !== '' && sessionDetails.id !== '') {
            let parsedChatbotResponse = {
                textMessage: sideWindowData.sideWindowContent + ' @@ ' + sideWindowData.sideWindowTitle,
                elements: ['message']
            }
            queueMessages[messageNumber] = {
                next: next,
                messageData: sideWindowData,
                parsedChatbotResponse: parsedChatbotResponse,
                type: 'sidebubble'
            };
            messageNumber++;
        } else {
            return next(sideWindowData);
        }
    });

    //User message
    chatbot.subscriptions.onSendMessage( function(messageData, next) {
        linksList = [];
        iframeList = [];
        queueMessages = [];
        messageNumber = 0;

        if (sessionDetails.botLanguage !== sessionDetails.userLanguage && messageData.message !== '' && !formQuestion) {
            deeplTranslate(messageData.message, 'user').then(function(result) {
                messageData.message = result;
                return next(messageData);
            });
        } else {
            return next(messageData);
        }
    });

    chatbot.subscriptions.onSetExternalInfo(function(escalationData, next) {
        if (escalationData.chatId !== undefined && escalationData.chatId.trim() !== '') {
            //Store the Hyperchat session id when escalation starts
            localStorage.setItem('hyperchatSessionId', escalationData.chatId);
            if (sessionDetails.botLanguage !== sessionDetails.userLanguage) {
                createEventListenerForHyperchat();
            }
        }
        return next(escalationData);
    });

    chatbot.subscriptions.onDisplaySystemMessage(function(data, next) {
        if (data.message === 'chat-closed') {
            localStorage.setItem('hyperchatSessionId', '');
            document.getElementsByClassName("footer__form__button")[0].style.visibility = "visible";
            inputText.removeEventListener("keydown", eventListenerFunction);
        }
        return next(data);
    });

    chatbot.subscriptions.onDomReady(function(next) {
        inputText = document.getElementsByClassName("inbenta-bot-input")[0];
        let sessionData = chatbot.actions.getSessionData();
        if (sessionData.sessionId !== undefined && sessionData.sessionId !== '') {
            let sessionDeeplTmp = JSON.parse(localStorage.getItem('sessionDeepl'));

            if (sessionData.sessionId !== sessionDeeplTmp.id) {
                setSessionId(sessionData.sessionId);
            } else {
                sessionDetails = sessionDeeplTmp;
            }
            if (sessionDetails.userLanguage !== '') {
                document.getElementsByClassName('lang-selector')[0].value = sessionDetails.userLanguage.toLowerCase();
            }

            let hyperchatSessionId = localStorage.getItem('hyperchatSessionId');
            if (hyperchatSessionId !== undefined && hyperchatSessionId !== null && hyperchatSessionId !== '' 
                && sessionDetails.botLanguage !== sessionDetails.userLanguage) {
                createEventListenerForHyperchat();
            }

            if (sessionDetails.userLanguage !== '') {
                document.getElementsByClassName('lang-selector')[0].value = sessionDetails.userLanguage.toLowerCase();
            }
            eventListenerForSelector();
        }
    });

    chatbot.subscriptions.onStartConversation(function(conversationData, next) {
        if (conversationData.sessionId !== undefined && conversationData.sessionId !== '') {
            setSessionId(conversationData.sessionId);
            if (sessionDetails.userLanguage !== '') {
                document.getElementsByClassName('lang-selector')[0].value = sessionDetails.userLanguage.toLowerCase();
            }
            eventListenerForSelector();
        }
    });

    //Reset language session
    chatbot.subscriptions.onResetSession(function(next) {
        setSessionId('');
        sessionDetails.userLanguage = '';
        setUserLang();
        localStorage.setItem('hyperchatSessionId', '');
        document.getElementsByClassName('lang-selector')[0].value = sessionDetails.botLanguage.toLowerCase();
        return next();
    });
} // export default
