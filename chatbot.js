(function () {
  var CONFIG = {
    brand: 'Imperium Infrastructure Partners',
    email: 'sheldon.rollins@icloud.com',
    phone: '(404) 302-7038',
    address: '125 Brown Street, Atlanta, GA 30349',
    hours: 'Mon–Fri 8am–5pm',
    area: 'Southeast USA (GA, AL, TN, NC, SC, FL)',
    services: ['Parking Lot Maintenance & Striping', 'HVAC Service & Repair', 'Janitorial & Cleaning', 'Commercial Painting', 'Safety & Compliance', 'Vendor Coordination'],
    groqKey: window.IMPERIUM_GROQ_KEY || '',
    groqModel: 'llama-3.3-70b-versatile',
    gaProperty: '443015703',
    waitBeforeOpen: 500,
    sessionTimeoutMin: 30
  };

  var STORAGE_KEY = 'imperium_chat_session';
  var state = {
    step: null,
    collected: {},
    messages: [],
    isOpen: false,
    isMinimized: true,
    awaitingInput: false,
    page: getPage()
  };

  // ===== DOM =====
  var widget, bubble, panel, messagesEl, inputEl, sendBtn, typingEl, headerCloseBtn;

  function createWidget() {
    if (document.getElementById('imperium-chat-widget')) return;

    widget = document.createElement('div');
    widget.id = 'imperium-chat-widget';
    widget.innerHTML =
      '<div id="ichat-bubble" role="button" tabindex="0" aria-label="Open chat">' +
        '<svg viewBox="0 0 24 24" width="28" height="28" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>' +
      '</div>' +
      '<div id="ichat-panel">' +
        '<div id="ichat-header">' +
          '<div id="ichat-header-info">' +
            '<div id="ichat-avatar">I</div>' +
            '<div>' +
              '<div id="ichat-title">Imperium Assistant</div>' +
              '<div id="ichat-status">Online</div>' +
            '</div>' +
          '</div>' +
          '<div id="ichat-header-actions">' +
            '<button id="ichat-minimize" aria-label="Minimize">—</button>' +
            '<button id="ichat-close" aria-label="Close">✕</button>' +
          '</div>' +
        '</div>' +
        '<div id="ichat-messages"></div>' +
        '<div id="ichat-typing" style="display:none"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>' +
        '<div id="ichat-input-area">' +
          '<input type="text" id="ichat-input" placeholder="Type a message..." autocomplete="off">' +
          '<button id="ichat-send" aria-label="Send">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
          '</button>' +
        '</div>' +
        '<div id="ichat-footer">🔒 Your information is secure</div>' +
      '</div>';

    document.body.appendChild(widget);
    bubble = document.getElementById('ichat-bubble');
    panel = document.getElementById('ichat-panel');
    messagesEl = document.getElementById('ichat-messages');
    inputEl = document.getElementById('ichat-input');
    sendBtn = document.getElementById('ichat-send');
    typingEl = document.getElementById('ichat-typing');
    headerCloseBtn = document.getElementById('ichat-close');
    var minimizeBtn = document.getElementById('ichat-minimize');

    bubble.addEventListener('click', open);
    bubble.addEventListener('keydown', function (e) { if (e.key === 'Enter') open(); });
    minimizeBtn.addEventListener('click', minimize);
    headerCloseBtn.addEventListener('click', close);
    sendBtn.addEventListener('click', handleSend);
    inputEl.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });
  }

  function getPage() {
    var p = window.location.pathname;
    if (p.includes('vendor-prequalification')) return 'vendor';
    if (p.includes('partner-assessment')) return 'partner';
    return 'home';
  }

  // ===== Open / Close / Minimize =====
  function open() {
    if (state.isOpen) return;
    state.isOpen = true;
    state.isMinimized = false;
    bubble.style.display = 'none';
    panel.classList.add('open');
    headerCloseBtn.focus();
    if (state.messages.length === 0) startConversation();
    scrollToBottom();
  }

  function minimize() {
    state.isMinimized = true;
    panel.classList.remove('open');
    bubble.style.display = 'flex';
    bubble.focus();
  }

  function close() {
    state.isOpen = false;
    state.isMinimized = true;
    panel.classList.remove('open');
    panel.style.display = 'none';
    bubble.style.display = 'none';
    widget.classList.add('closed');
  }

  // ===== Session =====
  function loadSession() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        var data = JSON.parse(saved);
        var elapsed = Date.now() - data.ts;
        if (elapsed < CONFIG.sessionTimeoutMin * 60 * 1000) {
          state.collected = data.collected || {};
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  function saveSession() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ collected: state.collected, ts: Date.now() }));
    } catch (e) {}
  }

  // ===== Business Hours =====
  function isBusinessHours() {
    var d = new Date();
    var day = d.getDay();
    var h = d.getHours();
    return day >= 1 && day <= 5 && h >= 8 && h < 17;
  }

  function getTimeGreeting() {
    var h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  // ===== Typing Indicator =====
  var typingTimer = null;

  function showTyping(cb) {
    typingEl.style.display = 'flex';
    scrollToBottom();
    if (typingTimer) clearTimeout(typingTimer);
    typingTimer = setTimeout(function () {
      typingEl.style.display = 'none';
      if (cb) cb();
      scrollToBottom();
    }, 800 + Math.random() * 700);
  }

  // ===== Message Rendering =====
  function scrollToBottom() {
    requestAnimationFrame(function () {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  function addMessage(text, role) {
    state.messages.push({ text: text, role: role });
    renderMessage(text, role);
  }

  function renderMessage(text, role) {
    var div = document.createElement('div');
    div.className = 'ichat-msg ' + (role === 'user' ? 'ichat-user' : 'ichat-bot');
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function renderQuickReplies(options) {
    state.awaitingInput = true;
    var container = document.createElement('div');
    container.className = 'ichat-quick-replies';
    options.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.className = 'ichat-qr-btn';
      btn.textContent = opt;
      btn.addEventListener('click', function () {
        state.awaitingInput = false;
        container.remove();
        addMessage(opt, 'user');
        handleOption(opt);
      });
      container.appendChild(btn);
    });
    messagesEl.appendChild(container);
    scrollToBottom();
  }

  function renderInputField() {
    state.awaitingInput = true;
    inputEl.disabled = false;
    inputEl.focus();
  }

  // ===== Start =====
  function startConversation() {
    var hasSession = loadSession();
    var hrs = isBusinessHours();

    if (!hrs) {
      say("Hi! Thanks for visiting " + CONFIG.brand + ". 👋\n\nWe're currently outside our business hours (" + CONFIG.hours + " ET). Leave us a message and we'll get back to you first thing!");
      renderInputField();
      state.step = 'question';
      return;
    }

    var greeting = getTimeGreeting() + "! Welcome to " + CONFIG.brand + ". 👋\n\nI'm your virtual assistant. I can help you with maintenance services, partnership info, or answer any questions you have. How can I assist you today?";

    if (hasSession && state.collected.name) {
      greeting = "Welcome back, " + state.collected.name + "! 😊 How can I help you today?";
    }

    if (state.page === 'vendor') {
      greeting = getTimeGreeting() + "! 👋 I see you're interested in becoming a vendor or partner. I can help you with the application process or answer any questions!";
    } else if (state.page === 'partner') {
      greeting = getTimeGreeting() + "! 👋 Thanks for your interest in partnering with us! I'm here to help you through the process.";
    }

    setImmediate(function () {
      addMessage(greeting, 'bot');
      renderQuickReplies(['I Need Maintenance Services', 'I Want to Become a Partner', 'I Have a Question']);
      state.step = 'intent';
    });
  }

  function say(text) {
    showTyping(function () {
      addMessage(text, 'bot');
      state.step = 'waiting';
    });
  }

  // ===== Option Handling =====
  function handleOption(opt) {
    if (opt === 'I Need Maintenance Services') {
      state.step = 'property_type';
      state.collected.intent = 'maintenance';
      say('We provide comprehensive commercial maintenance across the Southeast! What type of property do you need service for?');
      setImmediate(function () {
        renderQuickReplies(['Commercial', 'Retail', 'Office', 'Industrial', 'Multi-Family', 'Not Sure']);
      });
    } else if (opt === 'I Want to Become a Partner') {
      state.collected.intent = 'partner';
      handlePartner();
    } else if (opt === 'I Have a Question') {
      state.collected.intent = 'question';
      state.step = 'question';
      say("I'd be happy to help! Please type your question below, and I'll make sure the right person gets it.");
      setImmediate(function () {
        renderInputField();
      });
    } else if (state.step === 'property_type') {
      state.collected.propertyType = opt;
      state.step = 'service_needed';
      say('Great! What services are you looking for?');
      setImmediate(function () {
        renderQuickReplies(CONFIG.services);
      });
    } else if (state.step === 'service_needed') {
      state.collected.services = state.collected.services || [];
      if (!state.collected.services.includes(opt)) state.collected.services.push(opt);
      state.step = 'ask_name';
      say("Excellent choice! I'd love to connect you with our team. What's your name?");
      setImmediate(function () { renderInputField(); });
    } else if (opt === 'Yes, Schedule a Call') {
      state.step = 'schedule_date';
      say("Wonderful! What day works best for you? (e.g., 'tomorrow afternoon' or a specific date)");
      setImmediate(function () { renderInputField(); });
    } else if (opt === 'No Thanks, I\'ll Reach Out') {
      state.step = 'farewell';
      say("No problem at all! You can reach us anytime at " + CONFIG.phone + " or email " + CONFIG.email + ". Have a great day! 😊");
    } else if (opt === 'Yes, Open the Form') {
      window.open('vendor-prequalification.html', '_blank');
      state.step = 'farewell';
      say("I've opened the pre-qualification form in a new tab. If you need help filling it out, I'm right here!");
    } else if (opt === 'Tell Me More') {
      state.step = 'partner_more';
      say("We partner with qualified vendors across " + CONFIG.area + " in parking lot striping, painting, HVAC, janitorial services, and more. We handle client relationships, scheduling, and payments — you focus on the work.");
      setImmediate(function () {
        renderQuickReplies(['Yes, Open the Form', 'I Have a Question First']);
      });
    } else if (opt === 'Schedule a Call with Our Team') {
      state.step = 'schedule_date';
      say("Great! What day works best for you?");
      setImmediate(function () { renderInputField(); });
    } else if (opt === 'I Have a Question First') {
      state.step = 'question';
      state.collected.intent = 'question';
      say("Sure! What's your question?");
      setImmediate(function () { renderInputField(); });
    }
  }

  function handlePartner() {
    state.step = 'partner_offer';
    $say("We're always looking for qualified vendors and partners across " + CONFIG.area + "!\n\nWould you like to fill out our pre-qualification form to get started?");
    setImmediate(function () {
      renderQuickReplies(['Yes, Open the Form', 'Tell Me More']);
    });
  }

  function $say(text) {
    showTyping(function () {
      addMessage(text, 'bot');
    });
  }

  // ===== User Input =====
  function handleSend() {
    var text = inputEl.value.trim();
    if (!text || state.awaitingInput && !inputEl.disabled === false) return;
    if (!text) return;
    inputEl.value = '';
    addMessage(text, 'user');

    if (state.step === 'intent') {
      handleOption(text);
      return;
    }

    if (state.step === 'ask_name') {
      state.collected.name = text;
      state.step = 'ask_email';
      say("Nice to meet you, " + text + "! What's the best email to reach you?");
      setImmediate(function () { renderInputField(); });
      return;
    }

    if (state.step === 'ask_email') {
      if (!text.includes('@')) {
        say("Hmm, that doesn't look like an email address. Could you please provide a valid email?");
        setImmediate(function () { renderInputField(); });
        return;
      }
      state.collected.email = text;
      state.step = 'ask_phone';
      say("Thanks! And a phone number where we can reach you?");
      setImmediate(function () { renderInputField(); });
      return;
    }

    if (state.step === 'ask_phone') {
      state.collected.phone = text;
      state.step = 'schedule_offer';
      saveSession();
      var msg = 'Thanks, ' + state.collected.name + '! I have your info.\n\nWould you like to schedule a quick call with our team to discuss your needs?';
      if (state.collected.services && state.collected.services.length > 0) {
        msg = 'Thanks, ' + state.collected.name + '! I have your info regarding ' + state.collected.services.join(', ') + '.\n\nWould you like to schedule a call with our team?';
      }
      say(msg);
      setImmediate(function () {
        renderQuickReplies(['Yes, Schedule a Call', 'No Thanks, I\'ll Reach Out']);
      });
      sendCollected();
      return;
    }

    if (state.step === 'schedule_date') {
      state.collected.preferredDate = text;
      state.step = 'schedule_time';
      say("Got it! Do you prefer morning or afternoon?");
      setImmediate(function () {
        renderQuickReplies(['Morning', 'Afternoon', 'Either Works']);
      });
      return;
    }

    if (state.step === 'schedule_time') {
      state.collected.preferredTime = text;
      state.step = 'farewell';
      say("Perfect! We'll have someone reach out to confirm your appointment for " + (state.collected.preferredDate || 'soon') + " (" + text + "). Thanks for reaching out, " + (state.collected.name || '') + "! 😊");
      sendCollected();
      return;
    }

    if (state.step === 'question' || state.step === 'waiting') {
      state.collected.question = text;
      // Try AI if key available
      if (CONFIG.groqKey) {
        callGroq(text, function (reply) {
          addMessage(reply, 'bot');
          state.step = 'collect_after_ai';
          setImmediate(function () {
            renderQuickReplies(['Schedule a Call with Our Team', 'No Thanks']);
          });
        });
      } else {
        state.step = 'collect_name_question';
        say("Thanks for your message! Could you share your name so we can follow up with you?");
        setImmediate(function () { renderInputField(); });
      }
      return;
    }

    if (state.step === 'collect_name_question') {
      state.collected.name = text;
      state.step = 'collect_email_question';
      say("And your email address?");
      setImmediate(function () { renderInputField(); });
      return;
    }

    if (state.step === 'collect_email_question') {
      state.collected.email = text;
      state.step = 'farewell';
      say("Thanks, " + (state.collected.name || '') + "! We've received your message and will get back to you soon. 😊");
      sendCollected();
      return;
    }

    if (state.step === 'collect_after_ai' && text) {
      if (text.toLowerCase().includes('schedule') || text.toLowerCase().includes('call') || text.toLowerCase().includes('yes')) {
        state.step = 'schedule_date';
        say("Great! What day works best for you?");
        setImmediate(function () { renderInputField(); });
      } else {
        state.step = 'farewell';
        say("No problem! Feel free to reach out anytime at " + CONFIG.phone + " or " + CONFIG.email + ". Have a great day! 😊");
      }
      return;
    }

    // Fallback for anything else
    if (CONFIG.groqKey) {
      callGroq(text, function (reply) {
        addMessage(reply, 'bot');
      });
    } else {
      say("Thanks for sharing! Is there anything else I can help you with?");
      setImmediate(function () {
        renderQuickReplies(['I Need Maintenance Services', 'I Want to Become a Partner', 'No, That\'s All']);
      });
      state.step = 'intent';
    }
  }

  // ===== Groq AI =====
  function callGroq(userText, cb) {
    showTyping(function () {
      var systemPrompt = "You are a friendly, professional virtual assistant for " + CONFIG.brand + ", a commercial property maintenance and facility solutions company serving " + CONFIG.area + ". ";
      systemPrompt += "Services: " + CONFIG.services.join(', ') + ". ";
      systemPrompt += "Phone: " + CONFIG.phone + ", Email: " + CONFIG.email + ", Hours: " + CONFIG.hours + ". ";
      systemPrompt += "Address: " + CONFIG.address + ". ";
      systemPrompt += "Keep responses concise (1-3 sentences). Be warm and professional. Encourage them to schedule a consultation or share contact info if they have a specific need. Don't make up pricing.";

      var messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText }
      ];

      var xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://api.groq.com/openai/v1/chat/completions');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', 'Bearer ' + CONFIG.groqKey);

      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText);
            var reply = data.choices[0].message.content.trim();
            addMessage(reply, 'bot');
            if (cb) cb(reply);
            return;
          } catch (e) {}
        }
        addMessage("Thanks for your question! I'll make sure our team follows up with you. In the meantime, feel free to call us at " + CONFIG.phone + ".", 'bot');
        if (cb) cb('fallback');
      };

      xhr.onerror = function () {
        addMessage("Thanks for your question! I'll make sure our team follows up with you.", 'bot');
        if (cb) cb('fallback');
      };

      xhr.send(JSON.stringify({ model: CONFIG.groqModel, messages: messages, temperature: 0.7, max_tokens: 200 }));
    });
  }

  // ===== Email Collected Data =====
  function sendCollected() {
    if (!state.collected.name && !state.collected.email) return;
    var body = 'Chatbot Lead Collection\n';
    body += '================================\n';
    if (state.collected.name) body += 'Name: ' + state.collected.name + '\n';
    if (state.collected.email) body += 'Email: ' + state.collected.email + '\n';
    if (state.collected.phone) body += 'Phone: ' + state.collected.phone + '\n';
    if (state.collected.propertyType) body += 'Property Type: ' + state.collected.propertyType + '\n';
    if (state.collected.services && state.collected.services.length > 0) body += 'Services: ' + state.collected.services.join(', ') + '\n';
    if (state.collected.intent) body += 'Intent: ' + state.collected.intent + '\n';
    if (state.collected.preferredDate) body += 'Preferred Date: ' + state.collected.preferredDate + '\n';
    if (state.collected.preferredTime) body += 'Preferred Time: ' + state.collected.preferredTime + '\n';
    if (state.collected.question) body += 'Question: ' + state.collected.question + '\n';
    body += 'Page: ' + state.page + '\n';
    body += 'Timestamp: ' + new Date().toLocaleString() + '\n';

    var mailto = 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent('Chatbot Lead - ' + (state.collected.name || 'Website Visitor')) + '&body=' + encodeURIComponent(body);
    var img = new Image();
    img.style.display = 'none';
    img.src = 'https://www.google-analytics.com/collect?v=1&tid=G-' + CONFIG.gaProperty + '&cid=' + Date.now() + '&t=event&ec=chatbot&ea=lead&el=' + encodeURIComponent(state.collected.intent || 'unknown');
  }

  // ===== Exit Intent =====
  var exitTriggered = false;

  function setupExitIntent() {
    document.addEventListener('mouseleave', function (e) {
      if (exitTriggered) return;
      if (e.clientY > 0) return;
      if (state.isMinimized) {
        open();
      }
      exitTriggered = true;
      if (state.step !== 'farewell') {
        addMessage("Before you go! 🛑 I'm still here if you have any questions about our maintenance services or partnership opportunities. Can I help?", 'bot');
        state.step = 'exit_intent';
        renderQuickReplies(['I Need Maintenance Services', 'I Want to Become a Partner', 'I Have a Question', 'No Thanks']);
      }
    });
  }

  // ===== Init =====
  function init() {
    createWidget();
    setupExitIntent();

    var restored = loadSession();

    setTimeout(function () {
      open();
    }, CONFIG.waitBeforeOpen);

    // Pulse the bubble if minimized
    setInterval(function () {
      if (state.isMinimized) {
        bubble.classList.add('pulse');
        setTimeout(function () { bubble.classList.remove('pulse'); }, 1000);
      }
    }, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Utility for setImmediate
  function setImmediate(fn) {
    setTimeout(fn, 0);
  }
})();
