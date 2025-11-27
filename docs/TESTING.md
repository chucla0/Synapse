# Testing Guide - Synapse Agenda

This document outlines the procedures for verifying the functionality of the Synapse Agenda application, specifically focusing on the notification system and event approval workflows.

## Test Users Credentials

The database has been seeded with the following users for testing purposes:

| Role         | Email               | Password      |
| ------------ | ------------------- | ------------- |
| **Chief**    | `chief@test.com`    | `password123` |
| **Employee** | `employee@test.com` | `password123` |
| User 1       | `user1@test.com`    | `password123` |
| User 2       | `user2@test.com`    | `password123` |
| User 3       | `user3@test.com`    | `password123` |

## Verification Workflows

### 1. Event Approval Flow

**Objective**: Verify that a Chief can approve an event created by an Employee, and the Employee receives a notification.

1.  **Log in as Employee**: Use `employee@test.com` / `password123`.
2.  **Create Event**: Create a new event in the "Office Work" agenda (Laboral type).
    - Note: The event status will be `PENDING_APPROVAL`.
3.  **Log in as Chief**: Use `chief@test.com` / `password123`.
4.  **Approve Event**:
    - Navigate to the event date.
    - Click on the event to open details.
    - Click the **Aprobar** (Approve) button.
5.  **Verify Notification**:
    - Log back in as **Employee**.
    - Check the notification bell. You should see a notification: "Chief User has approved your event".

### 2. Event Rejection Flow

**Objective**: Verify that a Chief can reject an event, and the Employee receives a notification with the reason.

1.  **Log in as Employee**: Create another event in "Office Work".
2.  **Log in as Chief**: Find the event.
3.  **Reject Event**:
    - Click the **Rechazar** (Reject) button.
    - Enter a reason (optional) in the prompt.
4.  **Verify Notification**:
    - Log back in as **Employee**.
    - Check the notification bell. You should see a notification: "Chief User has rejected your event".

### 3. Delete Notifications Flow

**Objective**: Verify that deleting events or agendas triggers notifications to relevant users.

1.  **Log in as Chief**: `chief@test.com` / `password123`.
2.  **Delete Event**:
    - **Prerequisite**: The event must be CONFIRMED (approved) to be deleted by the Chief.
    - Open a confirmed event in "Office Work".
    - Click **Eliminar** (Delete). Confirm.
3.  **Delete Agenda**:
    - In the sidebar, hover over "Office Work".
    - Click the edit/settings icon.
    - Select **Eliminar Agenda** (Delete Agenda). Confirm.
4.  **Verify Notifications**:
    - Log in as **Employee**.
    - Check notifications. You should see:
      - "The event '...' has been deleted..."
      - "The agenda 'Office Work' has been deleted."

## Automated Tests

The project includes browser-based automated tests that can be run using the agentic tools. Refer to the `walkthrough.md` artifact for recent test run logs.
