# Export Scheduling Implementation Plan

## Overview
Add automated privacy data export functionality with scheduling options, allowing users to receive regular privacy reports via email or download.

## Technical Requirements

### Chrome Permissions
```json
// manifest.json additions
"permissions": ["alarms", "storage", "activeTab", "tabs"]
```

### Implementation Files
- `lib/export-scheduler.ts` - Scheduling logic and automation
- `lib/email-service.ts` - Email delivery integration (optional)
- `components/Settings/ExportScheduling.tsx` - Scheduling configuration UI
- `entrypoints/background.ts` - Alarm handling integration

## Core Implementation

### 1. Export Scheduler (`lib/export-scheduler.ts`)
```typescript
export class ExportScheduler {
  static async scheduleExport(config: ExportScheduleConfig): Promise<void>
  static async cancelSchedule(scheduleId: string): Promise<void>
  static async getActiveSchedules(): Promise<ExportSchedule[]>
  static async executeScheduledExport(scheduleId: string): Promise<void>
  static async updateSchedule(scheduleId: string, config: ExportScheduleConfig): Promise<void>
}
```

### 2. Schedule Configuration
```typescript
interface ExportScheduleConfig {
  frequency: 'daily' | 'weekly' | 'monthly';
  format: 'csv' | 'json' | 'pdf';
  deliveryMethod: 'download' | 'email' | 'cloud';
  emailAddress?: string;
  cloudService?: 'google-drive' | 'dropbox';
  dataRange: number; // days of data to include
  includeAnalysis: boolean;
}

interface ExportSchedule {
  id: string;
  config: ExportScheduleConfig;
  nextExecution: Date;
  lastExecution?: Date;
  status: 'active' | 'paused' | 'error';
  errorMessage?: string;
}
```

### 3. Email Integration (Optional)
```typescript
interface EmailConfig {
  service: 'smtp' | 'sendgrid' | 'mailgun';
  apiKey?: string;
  smtpConfig?: {
    host: string;
    port: number;
    secure: boolean;
    auth: { user: string; pass: string };
  };
}
```

## Implementation Steps

### Phase 1: Core Scheduling System (45 minutes)
1. Create ExportScheduler with Chrome alarms API integration
2. Implement schedule creation, modification, and cancellation
3. Add background alarm listener for automated exports
4. Create schedule persistence in chrome.storage

### Phase 2: Export Automation (30 minutes)
1. Integrate with existing export service for automated generation
2. Add file naming with timestamps and schedule info
3. Implement automatic download trigger
4. Add export history tracking and cleanup

### Phase 3: Advanced Delivery Options (15 minutes)
1. Add email delivery option with simple SMTP integration
2. Create cloud storage integration (Google Drive API)
3. Implement delivery status tracking and retry logic
4. Add notification system for successful/failed exports

## User Experience

### Schedule Configuration
- **Frequency Options**: Daily, Weekly (specific day), Monthly (specific date)
- **Format Selection**: CSV for spreadsheets, JSON for developers, PDF for reports
- **Delivery Methods**: Auto-download, Email, Cloud storage
- **Data Range**: Last 7/30/90 days of tracking data

### Schedule Management
- **Active Schedules List**: View all configured export schedules
- **Quick Actions**: Pause, resume, edit, delete schedules
- **Execution History**: See when exports were generated and delivered
- **Status Monitoring**: Track successful exports and error notifications

## Technical Implementation

### 1. Chrome Alarms Integration
```typescript
// Background script alarm handling
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('export-schedule-')) {
    const scheduleId = alarm.name.replace('export-schedule-', '');
    await ExportScheduler.executeScheduledExport(scheduleId);
  }
});

// Create recurring alarm
function createScheduleAlarm(schedule: ExportSchedule): void {
  const alarmName = `export-schedule-${schedule.id}`;
  
  chrome.alarms.create(alarmName, {
    when: schedule.nextExecution.getTime(),
    periodInMinutes: getIntervalMinutes(schedule.config.frequency)
  });
}
```

### 2. Automated Export Generation
```typescript
async function executeScheduledExport(scheduleId: string): Promise<void> {
  try {
    const schedule = await getSchedule(scheduleId);
    const events = await StorageManager.getEventsByDateRange(
      schedule.config.dataRange
    );
    
    // Generate export using existing service
    const exportData = await ExportService.generateExport(
      events,
      schedule.config.format,
      {
        includeAnalysis: schedule.config.includeAnalysis,
        filename: generateScheduledFilename(schedule)
      }
    );
    
    // Deliver based on method
    await deliverExport(exportData, schedule.config);
    
    // Update schedule status
    await updateScheduleStatus(scheduleId, 'success');
    
  } catch (error) {
    await updateScheduleStatus(scheduleId, 'error', error.message);
    await notifyExportError(scheduleId, error);
  }
}
```

### 3. Delivery Methods
```typescript
async function deliverExport(
  exportData: Blob,
  config: ExportScheduleConfig
): Promise<void> {
  switch (config.deliveryMethod) {
    case 'download':
      await triggerAutoDownload(exportData, config);
      break;
    case 'email':
      await sendEmailExport(exportData, config);
      break;
    case 'cloud':
      await uploadToCloud(exportData, config);
      break;
  }
}

// Auto-download implementation
async function triggerAutoDownload(data: Blob, config: ExportScheduleConfig): Promise<void> {
  const url = URL.createObjectURL(data);
  const filename = generateScheduledFilename(config);
  
  await chrome.downloads.download({
    url: url,
    filename: `phantom-trail-exports/${filename}`,
    saveAs: false
  });
}
```

## Schedule Types

### Frequency Options
1. **Daily**: Export every day at specified time
2. **Weekly**: Export every week on specified day
3. **Monthly**: Export on specific date each month
4. **Custom**: User-defined interval (advanced users)

### Data Range Options
- **Last 7 days**: Recent activity summary
- **Last 30 days**: Monthly privacy report
- **Last 90 days**: Quarterly comprehensive analysis
- **Custom range**: User-specified date range

### Export Formats
- **CSV**: Spreadsheet-compatible for analysis
- **JSON**: Developer-friendly structured data
- **PDF**: Human-readable privacy report with charts

## Integration Points

### Settings Integration
- Add "Export Scheduling" section to main settings
- Include schedule creation wizard
- Show active schedules with management options
- Provide export history and statistics

### Notification Integration
- Success notifications for completed exports
- Error notifications for failed exports
- Weekly summary of scheduled export activity
- Reminder notifications for inactive schedules

### Export Service Integration
- Extend existing ExportService for automated generation
- Add schedule-specific filename generation
- Include schedule metadata in export headers
- Support batch export generation

## Storage Schema

### Schedule Storage
```typescript
interface ScheduleStorage {
  schedules: Record<string, ExportSchedule>;
  history: ExportHistoryEntry[];
  settings: {
    maxHistoryEntries: number;
    defaultFormat: string;
    defaultDataRange: number;
  };
}

interface ExportHistoryEntry {
  scheduleId: string;
  executionTime: Date;
  status: 'success' | 'error';
  fileSize?: number;
  errorMessage?: string;
  deliveryMethod: string;
}
```

## Testing Strategy

### Functional Testing
1. Test schedule creation and alarm registration
2. Verify automated export generation works correctly
3. Test all delivery methods (download, email, cloud)
4. Validate schedule modification and cancellation

### Timing Testing
- Test alarm accuracy and reliability
- Verify exports execute at correct times
- Test timezone handling for scheduled exports
- Validate recurring schedule intervals

### Error Handling Testing
- Test behavior when export generation fails
- Verify retry logic for failed deliveries
- Test schedule recovery after browser restart
- Validate error notification system

## Success Metrics
- Scheduled exports execute reliably at specified times
- Users successfully receive automated privacy reports
- Export scheduling reduces manual export requests
- Error rate for scheduled exports remains below 5%

## Estimated Time: 1.5 hours
- Phase 1: 45 minutes (core scheduling system)
- Phase 2: 30 minutes (export automation)
- Phase 3: 15 minutes (advanced delivery options)

## Future Enhancements
- Advanced email templates with privacy insights
- Integration with calendar applications
- Conditional exports based on privacy score changes
- Team/organization export sharing features
