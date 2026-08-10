// Student Types
export interface Student {
  id?: string;
  registration_no: string;
  full_name: string;
  father_name?: string;
  b_form?: string;
  dob?: string;
  gender?: 'Male' | 'Female';
  phone?: string;
  parent_phone?: string;
  address?: string;
  class_id?: string;
  admission_fee?: number;
  monthly_fee?: number;
  discount?: number;
  photo_url?: string;
  is_active?: boolean;
}

// Staff Types
export interface Staff {
  id?: string;
  registration_no: string;
  full_name: string;
  father_name?: string;
  cnic?: string;
  dob?: string;
  phone?: string;
  whatsapp?: string;
  role: 'teacher' | 'admin';
  education?: string;
  designation?: string;
  salary?: number;
  assigned_class_id?: string;
  photo_url?: string;
  is_active?: boolean;
  resign_date?: string;
  resign_reason?: string;
}

// Class & Subject Types
export interface AcademyClass {
  id: string;
  class_name: string;
  section_name: string;
}

export interface Subject {
  id: string;
  subject_name: string;
}

// Attendance Types
export type AttendanceStatus = 'Present' | 'Absent' | 'Leave' | 'Late';

export interface StaffAttendanceRecord {
  staff_id: string;
  staff_name: string;
  role: string;
  status: AttendanceStatus;
}