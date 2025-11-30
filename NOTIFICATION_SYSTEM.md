# Notification System Logic & Schema

## 1. Delivery Logic (Pseudocode)

This logic determines whether to trigger a Browser Push Notification and/or Sound Alert when a new notification arrives.

```javascript
/**
 * Determines if a push/sound alert should be delivered.
 *
 * @param {Object} userStatus - Current user status ('AVAILABLE', 'AWAY', 'BUSY')
 * @param {Object} settings - User's notification settings
 * @param {boolean} settings.browserNotifications - Master toggle for push
 * @param {boolean} settings.soundEnabled - Master toggle for sound
 */
function shouldDeliverPushAlert(userStatus, settings) {
  // Rule 1: If status is AVAILABLE and Push is ON -> DELIVER
  if (userStatus === "AVAILABLE") {
    if (settings.browserNotifications) {
      return {
        push: true,
        sound: settings.soundEnabled, // Only play sound if enabled
      };
    }
    // If Push is OFF, do nothing
    return { push: false, sound: false };
  }

  // Rule 2: If status is BUSY or AWAY -> SUPPRESS
  if (userStatus === "BUSY" || userStatus === "AWAY") {
    // Regardless of settings, suppress alerts
    return { push: false, sound: false };
  }

  // Default: No alert
  return { push: false, sound: false };
}

// Usage Example
function onNewNotification(notification) {
  // 1. Database Registration is handled by Backend (Always 'Unread')

  // 2. Check Client-Side Delivery
  const delivery = shouldDeliverPushAlert(
    currentUser.status,
    settings.notifications
  );

  if (delivery.push) {
    new Notification("Synapse", { body: notification.message });
  }

  if (delivery.sound) {
    new Audio("/sounds/alert.mp3").play();
  }
}
```

## 2. Data Structure Schema

The `Notification` entity in the database supports the required fields for filtering and display.

```prisma
model Notification {
  id          String    @id @default(uuid()) // UUID
  type        NotificationType // Enum: INVITATION, EVENT_UPDATE, etc.
  createdAt   DateTime  @default(now()) // Timestamp
  isRead      Boolean   @default(false) // Unread status

  // Relations & Context
  recipientId String    // User who receives it
  senderId    String    // Collaborator Info (via relation)
  agendaId    String?   // Linked Agenda (for 'By Agenda' filter)
  eventId     String?   // Linked Event

  data        Json?     // Flexible field for extra info (e.g. roles, changes)

  // Relations
  recipient User   @relation("Recipient", fields: [recipientId], references: [id])
  sender    User   @relation("Sender", fields: [senderId], references: [id])
  agenda    Agenda? @relation(fields: [agendaId], references: [id])
  event     Event?  @relation(fields: [eventId], references: [id])
}

enum NotificationType {
  AGENDA_INVITE
  EVENT_CREATED
  EVENT_UPDATED
  EVENT_DELETED
  AGENDA_UPDATED
  AGENDA_DELETED
  ROLE_CHANGED
  EVENT_APPROVED
  EVENT_REJECTED
  EVENT_PENDING_APPROVAL
}
```
