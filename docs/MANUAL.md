# User Manual & Testing Guide

## Feature Guides

### 1. Laboral Agenda Workflow (Approval)

**Scenario**: An employee wants to request vacation time.

1.  **Employee** logs in and creates an event in the "Work" agenda.
2.  Event appears as **Pending Approval** (striped background).
3.  **Chief** receives a notification: "New event pending approval".
4.  **Chief** opens the event and clicks **Approve** or **Reject**.
5.  **Employee** receives a notification with the result.

### 2. Deleting Items

**Scenario**: Cleaning up old events or agendas.

1.  **Delete Event**: Open any event you have permission to delete and click the trash icon.
    - _Note: Pending events can be deleted by the creator. Confirmed events in Laboral agendas can be deleted by the Chief._
2.  **Delete Agenda**: Go to Agenda Settings (gear icon) -> Delete Agenda.
    - _Warning: This deletes all events and removes all members._

### 3. Recurring Events

**Scenario**: Weekly team meeting.

1.  Create an event.
2.  Toggle "Repeat".
3.  Select frequency (Daily, Weekly, Monthly).
4.  Set an end date or number of occurrences.

## Manual Verification Steps

To verify the system is working correctly:

1.  **Login** as `chief@test.com`.
2.  **Approve** the "Vacation Request" event on Dec 4, 2025.
3.  **Delete** the same event.
4.  **Delete** the "Office Work" agenda.
5.  **Login** as `employee@test.com`.
6.  **Check Notifications**: Verify you received alerts for approval, event deletion, and agenda deletion.
