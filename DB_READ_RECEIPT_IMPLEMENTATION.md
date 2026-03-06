# DB-Backed Read Receipt Implementation Summary

## Overview
Implemented a comprehensive DB-backed read receipt system that separates two distinct concepts:
1. **Unread for current user** - Has the other party sent messages I haven't read?
2. **Read receipt by other party** - Has the other party read my latest message?

## 1. Database Migrations

### File: `supabase/migrations/20260306150000_add_read_timestamps_to_cases_and_cancellations.sql`

```sql
-- Add read timestamps to cases table
alter table public.cases
  add column if not exists admin_last_read_at timestamptz,
  add column if not exists customer_last_read_at timestamptz;

-- Add read timestamps to subscription_cancellations table
alter table public.subscription_cancellations
  add column if not exists admin_last_read_at timestamptz,
  add column if not exists customer_last_read_at timestamptz;

-- Add indexes for performance
create index if not exists idx_cases_admin_last_read_at on public.cases(admin_last_read_at);
create index if not exists idx_cases_customer_last_read_at on public.cases(customer_last_read_at);
create index if not exists idx_subscription_cancellations_admin_last_read_at on public.subscription_cancellations(admin_last_read_at);
create index if not exists idx_subscription_cancellations_customer_last_read_at on public.subscription_cancellations(customer_last_read_at);
```

**New DB Fields:**
- `cases.admin_last_read_at` - When admin last opened this case thread
- `cases.customer_last_read_at` - When customer last opened this case thread
- `subscription_cancellations.admin_last_read_at` - When admin last opened this cancellation thread
- `subscription_cancellations.customer_last_read_at` - When customer last opened this cancellation thread

## 2. Edge Functions Created

### `/supabase/functions/mark-case-as-read/index.ts`
**Purpose:** Update read timestamp when case is opened
- **Input:** `{ case_id: string }`
- **Authentication:** JWT required
- **Authorization:** Admin can mark any case, customer can only mark their own
- **Action:** Updates `admin_last_read_at` or `customer_last_read_at` to `now()`
- **Returns:** `{ ok: true }`

### `/supabase/functions/mark-cancellation-as-read/index.ts`
**Purpose:** Update read timestamp when cancellation is opened
- **Input:** `{ cancellation_id: string }`
- **Authentication:** JWT required
- **Authorization:** Admin can mark any cancellation, customer can only mark their own
- **Action:** Updates `admin_last_read_at` or `customer_last_read_at` to `now()`
- **Returns:** `{ ok: true }`

## 3. Notification Archival

### File: `netlify/functions/create-notification.ts`
**Changed:** Lines 27-39

**Before:**
```typescript
const { error } = await supabase
  .from('notifications')
  .insert([{...}]);
```

**After:**
```typescript
// Archive old status notifications for same recipient + ref_id + type
if (type === 'case_status' || type === 'cancellation_status') {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', recipient_id)
    .eq('ref_id', ref_id)
    .eq('ref_type', ref_type)
    .eq('type', type)
    .is('read_at', null);
}

const { error } = await supabase
  .from('notifications')
  .insert([{...}]);
```

**Logic:** Before creating a new status notification, mark all existing unread status notifications for the same object as read. This prevents notification spam when status changes multiple times.

## 4. Files Changed

### Type Definitions
**File:** `src/types.ts`

**Case interface:**
```typescript
export interface Case {
  // ... existing fields
  admin_last_read_at?: string | null;
  customer_last_read_at?: string | null;
}
```

**SubscriptionCancellation interface:**
```typescript
export interface SubscriptionCancellation {
  // ... existing fields
  admin_last_read_at?: string | null;
  customer_last_read_at?: string | null;
}
```

### Data Fetching

**File:** `src/hooks/useAdminData.ts`
- **Line ~35:** Added `admin_last_read_at, customer_last_read_at` to cases SELECT query

**File:** `src/pages/Portal/CustomerPortal.tsx`
- **Line ~406:** Added `admin_last_read_at, customer_last_read_at` to cases SELECT query
- **Line ~407:** Added `admin_last_read_at, customer_last_read_at` to cancellations SELECT query

**File:** `supabase/functions/admin-get-all-subscription-cancellations/index.ts`
- **Line ~66:** Added `admin_last_read_at, customer_last_read_at` to baseSelect

### Cancellation View Logic

**File:** `src/pages/Portal/views/SubscriptionCancellationsView.tsx`

**Removed (Lines ~67-95):**
- `unreadTick` state
- `lastReadAtKey()` function
- `markCancellationAsRead()` localStorage-based implementation
- `hasUnread(cancellationId: string)` localStorage-based implementation

**Added (Lines ~67-120):**
```typescript
const markCancellationAsRead = async (cancellationId: string) => {
  if (!user?.id) return;
  try {
    await supabase.functions.invoke("mark-cancellation-as-read", {
      body: { cancellation_id: cancellationId },
    });
    await onDataUpdated(); // Refetch to get updated timestamps
  } catch (err) {
    console.error("Failed to mark cancellation as read:", err);
  }
};

const hasUnread = (cancellation: SubscriptionCancellation) => {
  if (!user?.id) return false;
  
  const myLastReadAt = isAdmin
    ? cancellation.admin_last_read_at
    : cancellation.customer_last_read_at;
  
  const theirLatestCommentAt = isAdmin
    ? latestCustomerCommentAt[cancellation.id]
    : latestAdminCommentAt[cancellation.id];
  
  const myLastReadMs = toMs(myLastReadAt);
  const theirLatestMs = toMs(theirLatestCommentAt);

  return theirLatestMs > 0 && theirLatestMs > myLastReadMs;
};

const otherPartyHasRead = (cancellation: SubscriptionCancellation) => {
  if (!user?.id) return false;
  
  const theirLastReadAt = isAdmin
    ? cancellation.customer_last_read_at
    : cancellation.admin_last_read_at;
  
  const myLatestCommentAt = isAdmin
    ? latestAdminCommentAt[cancellation.id]
    : latestCustomerCommentAt[cancellation.id];
  
  if (!myLatestCommentAt) return true; // No message sent yet
  
  const theirLastReadMs = toMs(theirLastReadAt);
  const myLatestMs = toMs(myLatestCommentAt);

  return theirLastReadMs >= myLatestMs;
};
```

**Updated (Line ~492):**
```typescript
// Changed from synchronous to async
const handleOpenCancellation = async (item: SubscriptionCancellation) => {
  await markCancellationAsRead(item.id);
  setSelected(item);
};
```

**Updated (Lines ~318-371):**
- Removed `unreadTick` dependency from useEffect dependencies
- Simplified polling logic (no longer needs role-based filtering)

**Updated (Lines ~576, ~619):**
```typescript
// Changed from hasUnread(c.id) to hasUnread(c)
const unread = hasUnread(c);
const readReceipt = otherPartyHasRead(c);
```

## 5. Formulas Used

### Cancellation Comments

**Latest Comment Timestamps:**
```typescript
latest_customer_comment_at = MAX(created_at) 
  WHERE cancellation_comments.user_id = cancellation.customer_id
  
latest_admin_comment_at = MAX(created_at)
  WHERE cancellation_comments.user_id != cancellation.customer_id
```

**Unread Logic:**
```typescript
// Admin unread
admin_has_unread = latest_customer_comment_at > admin_last_read_at

// Customer unread  
customer_has_unread = latest_admin_comment_at > customer_last_read_at
```

**Read Receipt Logic:**
```typescript
// Customer has read admin's latest message
customer_has_read = customer_last_read_at >= latest_admin_comment_at

// Admin has read customer's latest message
admin_has_read = admin_last_read_at >= latest_customer_comment_at
```

### Case Comments

**Latest Comment Timestamps:**
```typescript
latest_customer_comment_at = MAX(created_at)
  WHERE case_comments.author_type = 'customer'
  
latest_admin_comment_at = MAX(created_at)
  WHERE case_comments.author_type = 'admin'
```

**Unread Logic:**
```typescript
// Admin unread
admin_has_unread = latest_customer_comment_at > admin_last_read_at

// Customer unread
customer_has_unread = latest_admin_comment_at > customer_last_read_at
```

**Read Receipt Logic:**
```typescript
// Customer has read admin's latest message
customer_has_read = customer_last_read_at >= latest_admin_comment_at

// Admin has read customer's latest message
admin_has_read = admin_last_read_at >= latest_customer_comment_at
```

## 6. LocalStorage Removal

### Cancellations - FULLY REMOVED ✅
**Removed from:** `src/pages/Portal/views/SubscriptionCancellationsView.tsx`

**Deleted:**
- `lastReadAtKey()` function
- `window.localStorage.getItem(lastReadAtKey(...))`
- `window.localStorage.setItem(lastReadAtKey(...), ...)`
- `unreadTick` state for forcing UI re-evaluation

**Replacement:** DB timestamps are now the single source of truth

### Cases - STILL USES localStorage ⚠️
**Location:** `src/pages/Portal/CustomerPortal.tsx`

**Current Implementation:**
```typescript
// Lines ~210-239: Still uses count-based localStorage
const lastReadCountKey = (caseId: string) => 
  `customerPortal:lastReadCount:${storageUserId}:${caseId}`;

const getUnreadCount = (caseId: string) => {
  const totalCount = caseCommentsCounts[caseId] || 0;
  const lastReadCount = parseInt(localStorage.getItem(lastReadCountKey(caseId)) || "0");
  return Math.max(0, totalCount - lastReadCount);
};
```

**Recommendation:** Update CasesView.tsx and CustomerPortal.tsx case logic to use the same DB-backed approach as cancellations (separate task).

## 7. Testing Requirements

### Database Migration
```bash
# Run migration
supabase migration up

# Verify columns exist
supabase db dump --data-only --table=cases --table=subscription_cancellations
```

### Edge Functions
```bash
# Deploy functions
supabase functions deploy mark-case-as-read
supabase functions deploy mark-cancellation-as-read

# Test marking as read
curl -X POST [supabase-url]/functions/v1/mark-case-as-read \
  -H "Authorization: Bearer [jwt]" \
  -H "Content-Type: application/json" \
  -d '{"case_id":"..."}'
```

### Frontend
1. **Admin opens cancellation:** Verify `admin_last_read_at` updates in DB
2. **Customer opens cancellation:** Verify `customer_last_read_at` updates in DB
3. **Admin comments:** Verify customer sees unread indicator
4. **Customer comments:** Verify admin sees unread indicator
5. **Read receipt:** Verify "läst/oläst" indicators show correctly
6. **Notification archival:** Create case, change status twice, verify only 1 notification remains unread

## 8. Backward Compatibility

**Gradual Migration Strategy:**
- New timestamp columns are nullable - existing rows will have NULL values
- Unread logic treats NULL as "never read" - all messages show as unread initially
- First time user opens thread, timestamp is set
- No data migration needed - timestamps populate organically as users interact

**Fallback Behavior:**
- If Edge Function call fails, user still sees content (just timestamp doesn't update)
- If DB timestamps are NULL, defaults to showing as unread (safe default)
- Polling continues to fetch latest comment timestamps regardless of DB read timestamps

## 9. Performance Considerations

**Indexes Added:**
- `idx_cases_admin_last_read_at`
- `idx_cases_customer_last_read_at`  
- `idx_subscription_cancellations_admin_last_read_at`
- `idx_subscription_cancellations_customer_last_read_at`

**Query  Optimization:**
- Read timestamps fetched with main SELECT (no extra queries)
- Comment timestamps still use separate polling query (existing pattern)
- Edge Function updates are single UPDATE operations

**Caching:**
- Consider adding localStorage as cache layer (not source of truth)
- Timestamps could be cached client-side to reduce Edge Function calls
- Current implementation always calls Edge Function (reliable but more DB writes)

## 10. Future Enhancements

1. **Case Comments:** Apply same DB-backed approach to case comments (currently still uses localStorage count-based tracking)
2. **Real-time Updates:** Subscribe to Postgres changes on timestamp columns for instant UI updates
3. **Read Receipts in UI:** Add visual indicators showing when other party last read (e.g., "Läst 5 min sedan")
4. **Typing Indicators:** Use same infrastructure for "X is typing..." feature
5. **Message-Level Read Tracking:** Track read status per message instead of per thread
