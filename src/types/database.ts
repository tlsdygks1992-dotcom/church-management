// Supabase 스키마 기반 TypeScript 타입 정의
// 실제 프로젝트에서는 `npx supabase gen types typescript` 명령으로 자동 생성 권장

export type UserRole = 'super_admin' | 'president' | 'accountant' | 'team_leader' | 'member'
export type DepartmentCode = 'ck' | 'cu' | 'cu_worship' | 'youth' | 'cu1' | 'cu2' | 'leader'
export type ReportType = 'weekly' | 'meeting' | 'education'
export type ApprovalStatus =
  | 'draft'
  | 'submitted'
  | 'coordinator_reviewed'
  | 'manager_approved'
  | 'final_approved'
  | 'rejected'
  | 'revision_requested'
export type AttendanceType = 'worship' | 'meeting'

// 회계 카테고리
export type ExpenseCategory =
  | '운영비 수입' | '기타 수입'  // 수입
  | '운영비' | '비품' | '경조사' | 'CU1행사' | 'CU2행사' | 'CU공통' | '리더지원' | '셀장지원' | '교육' | '기타'  // 지출

export const INCOME_CATEGORIES: ExpenseCategory[] = ['운영비 수입', '기타 수입']
export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['운영비', '비품', '경조사', 'CU1행사', 'CU2행사', 'CU공통', '리더지원', '셀장지원', '교육', '기타']
export const ALL_EXPENSE_CATEGORIES: ExpenseCategory[] = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]

export interface Database {
  public: {
    Tables: {
      departments: {
        Row: {
          id: string
          code: DepartmentCode
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['departments']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['departments']['Insert']>
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          phone: string | null
          role: UserRole
          department_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      user_departments: {
        Row: {
          id: string
          user_id: string
          department_id: string
          is_team_leader: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_departments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['user_departments']['Insert']>
      }
      member_departments: {
        Row: {
          id: string
          member_id: string
          department_id: string
          is_primary: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['member_departments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['member_departments']['Insert']>
      }
      members: {
        Row: {
          id: string
          name: string
          phone: string | null
          email: string | null
          birth_date: string | null
          address: string | null
          occupation: string | null
          photo_url: string | null
          photo_updated_at: string | null
          department_id: string | null  // 호환성을 위해 유지 (옵셔널)
          is_active: boolean
          joined_at: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['members']['Row'], 'id' | 'created_at' | 'updated_at' | 'joined_at' | 'department_id'> & { joined_at?: string; department_id?: string | null }
        Update: Partial<Database['public']['Tables']['members']['Insert']>
      }
      weekly_reports: {
        Row: {
          id: string
          department_id: string
          report_date: string
          week_number: number | null
          year: number
          author_id: string
          total_registered: number
          worship_attendance: number
          meeting_attendance: number
          notes: string | null
          status: ApprovalStatus
          submitted_at: string | null
          coordinator_id: string | null
          coordinator_reviewed_at: string | null
          coordinator_comment: string | null
          manager_id: string | null
          manager_approved_at: string | null
          manager_comment: string | null
          final_approver_id: string | null
          final_approved_at: string | null
          final_comment: string | null
          rejected_by: string | null
          rejected_at: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['weekly_reports']['Row'],
          'id' | 'created_at' | 'updated_at' | 'total_registered' | 'worship_attendance' | 'meeting_attendance' | 'status' | 'year'>
          & {
            total_registered?: number
            worship_attendance?: number
            meeting_attendance?: number
            status?: ApprovalStatus
            year?: number
          }
        Update: Partial<Database['public']['Tables']['weekly_reports']['Insert']>
      }
      approval_history: {
        Row: {
          id: string
          report_id: string
          approver_id: string
          from_status: ApprovalStatus
          to_status: ApprovalStatus
          comment: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['approval_history']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['approval_history']['Insert']>
      }
      report_programs: {
        Row: {
          id: string
          report_id: string
          start_time: string
          content: string
          person_in_charge: string | null
          order_index: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['report_programs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['report_programs']['Insert']>
      }
      attendance_records: {
        Row: {
          id: string
          member_id: string
          report_id: string | null
          attendance_date: string
          attendance_type: AttendanceType
          is_present: boolean
          checked_by: string | null
          checked_via: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['attendance_records']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['attendance_records']['Insert']>
      }
      newcomers: {
        Row: {
          id: string
          report_id: string
          name: string
          phone: string | null
          birth_date: string | null
          introducer: string | null
          address: string | null
          affiliation: string | null
          department_id: string | null
          converted_to_member_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['newcomers']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['newcomers']['Insert']>
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh_key: string
          auth_key: string
          device_name: string | null
          user_agent: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['push_subscriptions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['push_subscriptions']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string | null
          link: string | null
          report_id: string | null
          is_read: boolean
          is_sent: boolean
          sent_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      expense_requests: {
        Row: {
          id: string
          department_id: string
          requester_id: string
          request_date: string
          total_amount: number
          recipient_name: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['expense_requests']['Row'], 'id' | 'created_at' | 'updated_at' | 'total_amount'> & { total_amount?: number }
        Update: Partial<Database['public']['Tables']['expense_requests']['Insert']>
      }
      expense_items: {
        Row: {
          id: string
          expense_request_id: string
          item_date: string
          description: string
          category: string
          amount: number
          notes: string | null
          order_index: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['expense_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['expense_items']['Insert']>
      }
      accounting_records: {
        Row: {
          id: string
          department_id: string
          record_date: string
          description: string
          income_amount: number
          expense_amount: number
          balance: number
          category: string
          notes: string | null
          expense_request_id: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['accounting_records']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['accounting_records']['Insert']>
      }
    }
    Views: {
      pending_approvals: {
        Row: {
          id: string
          report_date: string
          status: ApprovalStatus
          department_name: string
          author_name: string
          created_at: string
          submitted_at: string | null
          pending_role: 'coordinator' | 'manager' | 'final'
        }
      }
      department_attendance_summary: {
        Row: {
          department_id: string
          department_name: string
          report_date: string
          year: number
          week_number: number
          total_registered: number
          worship_attendance: number
          meeting_attendance: number
          worship_rate: number
        }
      }
    }
    Enums: {
      user_role: UserRole
      department_code: DepartmentCode
      approval_status: ApprovalStatus
      attendance_type: AttendanceType
    }
  }
}

// 편의 타입 별칭
export type Department = Database['public']['Tables']['departments']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Member = Database['public']['Tables']['members']['Row']
export type MemberDepartment = Database['public']['Tables']['member_departments']['Row']
export type WeeklyReport = Database['public']['Tables']['weekly_reports']['Row']
export type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row']
export type Newcomer = Database['public']['Tables']['newcomers']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type ReportProgram = Database['public']['Tables']['report_programs']['Row']
export type ApprovalHistory = Database['public']['Tables']['approval_history']['Row']

// 교인 + 부서 정보 조인 타입
export interface MemberWithDepartments extends Member {
  member_departments: Array<{
    department_id: string
    is_primary: boolean
    departments: {
      id: string
      name: string
      code?: string
    }
  }>
}

// 회계 관련 타입
export type ExpenseRequest = Database['public']['Tables']['expense_requests']['Row']
export type ExpenseItem = Database['public']['Tables']['expense_items']['Row']
export type AccountingRecord = Database['public']['Tables']['accounting_records']['Row']

// 지출결의서 + 항목 조인 타입
export interface ExpenseRequestWithItems extends ExpenseRequest {
  expense_items: ExpenseItem[]
  departments?: { name: string }
  users?: { name: string }
}

// 회계장부 + 부서 조인 타입
export interface AccountingRecordWithDetails extends AccountingRecord {
  departments?: { name: string }
  users?: { name: string }
}

// 권한 체크 함수는 src/lib/permissions.ts로 이동
// 하위 호환성을 위한 re-export
export { canAccessAllDepartments, canAccessAccounting } from '@/lib/permissions'
