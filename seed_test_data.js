const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function seed() {
  try {
    console.log('🌱 Starting seed process...');

    // 1. Register Chief
    console.log('1. Registering Chief...');
    const chiefEmail = `chief_${Date.now()}@test.com`;
    const password = 'password123';
    const chiefRes = await axios.post(`${API_URL}/auth/register`, {
      name: 'Jefe Supremo',
      email: chiefEmail,
      password: password
    });
    const chiefToken = chiefRes.data.tokens.accessToken;
    const chiefId = chiefRes.data.user.id;
    console.log(`   ✅ Chief created: ${chiefEmail}`);

    // 2. Register Employee
    console.log('2. Registering Employee...');
    const empEmail = `employee_${Date.now()}@test.com`;
    const empRes = await axios.post(`${API_URL}/auth/register`, {
      name: 'Empleado Currito',
      email: empEmail,
      password: password
    });
    const empToken = empRes.data.tokens.accessToken;
    const empId = empRes.data.user.id;
    console.log(`   ✅ Employee created: ${empEmail}`);

    // 3. Create Laboral Agenda (as Chief)
    console.log('3. Creating Laboral Agenda...');
    const agendaRes = await axios.post(`${API_URL}/agendas`, {
      name: 'Oficina Central',
      description: 'Agenda de trabajo',
      type: 'LABORAL',
      color: '#FF5733'
    }, {
      headers: { Authorization: `Bearer ${chiefToken}` }
    });
    const agendaId = agendaRes.data.agenda.id;
    console.log(`   ✅ Agenda created: ${agendaId}`);

    // 4. Invite Employee to Agenda (as Chief)
    console.log('4. Inviting Employee to Agenda...');
    await axios.post(`${API_URL}/agendas/${agendaId}/users`, {
      email: empEmail,
      role: 'EMPLOYEE'
    }, {
      headers: { Authorization: `Bearer ${chiefToken}` }
    });
    console.log('   ✅ Invitation sent');

    // 5. Accept Invitation (as Employee)
    console.log('5. Accepting Invitation...');
    // Fetch notifications to find the invite
    const notifRes = await axios.get(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    
    const inviteNotif = notifRes.data.notifications.find(n => 
      n.type === 'AGENDA_INVITE' && n.agendaId === agendaId
    );

    if (!inviteNotif) {
      throw new Error('Invitation notification not found for employee');
    }

    // Accept it
    await axios.post(`${API_URL}/agendas/invitations/accept`, {
      notificationId: inviteNotif.id
    }, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    console.log('   ✅ Invitation accepted');

    // 6. Create Event (as Employee)
    console.log('6. Creating Event (as Employee)...');
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 24); // Tomorrow
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);

    const eventRes = await axios.post(`${API_URL}/events`, {
      title: 'Reunión Pendiente',
      description: 'Esta reunión requiere aprobación. Revisar documentos adjuntos.',
      location: 'Sala de Juntas B',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      agendaId: agendaId,
      isAllDay: false,
      color: '#FF5733',
      links: [{ url: 'https://google.com', title: 'Documentación' }]
    }, {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    const eventId = eventRes.data.event.id;
    console.log('   ✅ Event created:', eventId);
    console.log('   ℹ️  Event Status:', eventRes.data.event.status);

    // 7. Approve Event (as Chief)
    console.log('7. Approving Event (as Chief)...');
    await axios.post(`${API_URL}/events/${eventId}/approve`, {}, {
      headers: { Authorization: `Bearer ${chiefToken}` }
    });
    console.log('   ✅ Event approved');

    // 8. Change Role (as Chief)
    console.log('8. Changing Employee Role to EDITOR...');
    await axios.put(`${API_URL}/agendas/${agendaId}/users/${empId}/role`, {
      role: 'EDITOR'
    }, {
      headers: { Authorization: `Bearer ${chiefToken}` }
    });
    console.log('   ✅ Role changed');

    // 9. Register Viewer (to test Invite Notification)
    console.log('9. Registering Viewer...');
    const viewerEmail = `viewer_${Date.now()}@test.com`;
    const viewerRes = await axios.post(`${API_URL}/auth/register`, {
      name: 'Visitante Curioso',
      email: viewerEmail,
      password: password
    });
    const viewerToken = viewerRes.data.tokens.accessToken;
    console.log(`   ✅ Viewer created: ${viewerEmail}`);

    // 10. Invite Viewer (as Chief) - DO NOT ACCEPT
    console.log('10. Inviting Viewer to Agenda...');
    await axios.post(`${API_URL}/agendas/${agendaId}/users`, {
      email: viewerEmail,
      role: 'VIEWER'
    }, {
      headers: { Authorization: `Bearer ${chiefToken}` }
    });
    console.log('   ✅ Invitation sent (Pending)');

    console.log('\n🎉 Seed completed successfully!');
    console.log('------------------------------------------------');
    console.log('Login Details:');
    console.log(`Chief (Owner):    ${chiefEmail} / ${password} (Check for Event Created)`);
    console.log(`Employee:         ${empEmail} / ${password} (Check for Event Approved & Role Changed)`);
    console.log(`Viewer:           ${viewerEmail} / ${password} (Check for Agenda Invite)`);
    console.log('------------------------------------------------');

  } catch (error) {
    console.error('❌ Error seeding data:', error.response?.data || error.message);
  }
}

seed();
