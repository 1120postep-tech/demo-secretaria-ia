const chatBody = document.querySelector('#chatBody');
const chatForm = document.querySelector('#chatForm');
const messageInput = document.querySelector('#messageInput');
const quickActions = document.querySelector('#quickActions');
const activityFeed = document.querySelector('#activityFeed');
const conversationCount = document.querySelector('#conversationCount');
const appointmentCount = document.querySelector('#appointmentCount');
const toast = document.querySelector('#toast');

let state = { step: null, service: '', date: '', appointments: 8, conversations: 24 };

const now = () => new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
const escapeHtml = (value) => value.replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
})[character]);

function addMessage(text, sender = 'bot') {
  const row = document.createElement('div');
  row.className = `message-row ${sender}`;
  row.innerHTML = sender === 'bot'
    ? `<span class="mini-avatar">AI</span><div class="bubble-wrap"><div class="bubble">${text}</div><span class="time">${now()}</span></div>`
    : `<div class="bubble-wrap"><div class="bubble"></div><span class="time">${now()}</span></div>`;
  if (sender === 'user') row.querySelector('.bubble').textContent = text;
  chatBody.appendChild(row);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function showTyping() {
  const row = document.createElement('div');
  row.className = 'message-row typing';
  row.id = 'typing';
  row.innerHTML = '<span class="mini-avatar">AI</span><div class="bubble"><b></b><b></b><b></b></div>';
  chatBody.appendChild(row);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function setActions(actions) {
  quickActions.innerHTML = '';
  actions.forEach(([label, message]) => {
    const button = document.createElement('button');
    button.textContent = label;
    button.dataset.message = message;
    quickActions.appendChild(button);
  });
}

function addActivity(type, title, description) {
  const symbols = { check: '✓', message: '↗', user: '+' };
  const item = document.createElement('div');
  item.className = 'activity-item';
  item.innerHTML = `<span class="activity-dot ${type}">${symbols[type]}</span><div><strong>${title}</strong><p>${description}</p></div><time>Ahora</time>`;
  activityFeed.prepend(item);
  while (activityFeed.children.length > 3) activityFeed.lastElementChild.remove();
}

function updateStats(kind) {
  if (kind === 'conversation') {
    state.conversations += 1;
    conversationCount.textContent = state.conversations;
  }
  if (kind === 'appointment') {
    state.appointments += 1;
    appointmentCount.textContent = state.appointments;
  }
}

function replyFor(message) {
  const text = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (state.step === 'service') {
    state.service = escapeHtml(message);
    state.step = 'date';
    setActions([['Mañana', 'Mañana'], ['Este viernes', 'Este viernes'], ['Próxima semana', 'Próxima semana']]);
    return `Perfecto, <strong>${state.service}</strong>. ¿Qué día te viene mejor?`;
  }
  if (state.step === 'date') {
    state.date = escapeHtml(message);
    state.step = 'time';
    setActions([['10:30', '10:30'], ['12:00', '12:00'], ['17:30', '17:30']]);
    return `Tengo estos espacios disponibles para <strong>${state.date}</strong>. ¿Cuál prefieres?`;
  }
  if (state.step === 'time') {
    state.step = 'name';
    setActions([]);
    return `¡Excelente! Reservaré <strong>${state.service}</strong> el <strong>${state.date} a las ${escapeHtml(message)}</strong>. Solo necesito tu nombre para completar la cita.`;
  }
  if (state.step === 'name') {
    state.step = null;
    updateStats('appointment');
    addActivity('check', 'Cita confirmada', `${state.service} · ${state.date}`);
    setActions([['Ver mis datos', 'Ver resumen de mi cita'], ['Otra consulta', 'Tengo otra consulta']]);
    return `¡Listo, <strong>${escapeHtml(message)}</strong>! Tu cita quedó confirmada. Te enviaríamos el recordatorio por WhatsApp unas horas antes. <br><br>✓ Sin llamadas &nbsp; ✓ Sin esperas`;
  }

  if (/agendar|cita|reservar|consulta/.test(text) && !/otra consulta/.test(text)) {
    state.step = 'service';
    setActions([['Valoración inicial', 'Valoración inicial'], ['Limpieza facial', 'Limpieza facial'], ['Depilación láser', 'Depilación láser']]);
    return '¡Claro! Puedo agendarla ahora mismo. ¿Qué servicio te interesa?';
  }
  if (/servicio|tratamiento|ofrecen/.test(text)) {
    addActivity('message', 'Consulta respondida', 'Información de tratamientos');
    setActions([['Agendar valoración', 'Quiero agendar una cita'], ['Ver precios', '¿Cuánto cuestan?']]);
    return 'En Clínica Lumina ofrecemos <strong>valoraciones estéticas, limpiezas faciales, depilación láser y tratamientos de rejuvenecimiento</strong>. ¿Te gustaría reservar una valoración sin compromiso?';
  }
  if (/precio|cuanto|costo/.test(text)) {
    setActions([['Agendar valoración', 'Quiero agendar una cita'], ['Hablar con persona', 'Necesito hablar con una persona']]);
    return 'Los tratamientos comienzan desde <strong>$650 MXN</strong>. El precio exacto depende de tus objetivos; puedo agendar una valoración para darte una recomendación personalizada.';
  }
  if (/horario|abren|cierran/.test(text)) {
    addActivity('message', 'Consulta respondida', 'Horarios de atención');
    setActions([['Agendar ahora', 'Quiero agendar una cita'], ['Ubicación', '¿Dónde están ubicados?']]);
    return 'Atendemos de <strong>lunes a viernes de 9:00 a 19:00</strong> y sábados de 9:00 a 14:00. Yo puedo ayudarte las 24 horas.';
  }
  if (/ubicacion|donde|direccion/.test(text)) {
    setActions([['Cómo llegar', '¿Cómo puedo llegar?'], ['Agendar cita', 'Quiero agendar una cita']]);
    return 'Estamos en <strong>Av. Central 245, Col. Centro</strong>, con estacionamiento para pacientes. En una integración real también te enviaría el enlace directo de Google Maps.';
  }
  if (/persona|humano|asesor/.test(text)) {
    addActivity('user', 'Seguimiento solicitado', 'Transferencia al equipo humano');
    return 'Por supuesto. Ya dejé tu solicitud marcada como prioritaria para que una persona del equipo te contacte. Mientras tanto, puedo tomar tus datos o resolver otra duda.';
  }
  if (/resumen|mis datos/.test(text)) {
    return state.service ? `Tu cita: <strong>${state.service}</strong>, ${state.date}. La confirmación y los recordatorios quedarían sincronizados con tu calendario y WhatsApp.` : 'Aún no hay una cita activa. Puedo ayudarte a reservar una en menos de un minuto.';
  }
  if (/hola|buenos|buenas/.test(text)) {
    return '¡Hola! Qué gusto atenderte. Soy Alba, la secretaria virtual de Clínica Lumina. Puedo ayudarte con servicios, horarios o agendar una cita.';
  }
  if (/gracias/.test(text)) return '¡Con mucho gusto! Estoy aquí cuando me necesites.';

  addActivity('message', 'Consulta atendida', 'Respuesta personalizada por IA');
  setActions([['Agendar cita', 'Quiero agendar una cita'], ['Ver servicios', '¿Qué servicios ofrecen?'], ['Hablar con persona', 'Necesito hablar con una persona']]);
  return 'Puedo ayudarte con citas, precios, servicios, horarios y ubicación. Si tu consulta necesita atención especial, también puedo pasarla al equipo humano. ¿Qué te gustaría hacer?';
}

function processMessage(message) {
  if (!message.trim()) return;
  addMessage(message.trim(), 'user');
  updateStats('conversation');
  showTyping();
  messageInput.value = '';
  setTimeout(() => {
    document.querySelector('#typing')?.remove();
    addMessage(replyFor(message.trim()));
  }, 550 + Math.random() * 450);
}

function resetDemo() {
  state = { step: null, service: '', date: '', appointments: 8, conversations: 24 };
  chatBody.innerHTML = '';
  conversationCount.textContent = '24';
  appointmentCount.textContent = '8';
  setActions([['Agendar cita', 'Quiero agendar una cita'], ['Ver servicios', '¿Qué servicios ofrecen?'], ['Consultar horario', '¿Cuál es el horario?']]);
  addMessage('¡Hola! Soy <strong>Alba</strong>, la secretaria virtual de Clínica Lumina. Estoy aquí para ayudarte las 24 horas.');
  setTimeout(() => addMessage('Puedo resolver tus dudas, contarte sobre nuestros servicios o agendar una cita. ¿En qué te ayudo hoy?'), 180);
}

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  processMessage(messageInput.value);
});
quickActions.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-message]');
  if (button) processMessage(button.dataset.message);
});
document.querySelector('#resetButton').addEventListener('click', () => {
  resetDemo();
  toast.textContent = 'Demo reiniciada';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
});

resetDemo();
