export type Role = 'ALUNO' | 'PROFESSOR' | 'DIRETOR';
export type ClassStatus = 'ACTIVE' | 'FINISHED' | 'UPCOMING';
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'DROPPED';
export type LessonStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type AttendanceStatus = 'PENDING' | 'PRESENT' | 'ABSENT' | 'EXCUSED';
export type PointType = 'LOGIN' | 'ATTENDANCE' | 'ACTIVITY' | 'MANUAL';
export type ContentType = 'PLANNED' | 'TAUGHT' | 'COMPLEMENTARY';

export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileEntity {
  id: string;
  userId: string;
  bio?: string | null;
  phone?: string | null;
  document?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentEntity {
  id: string;
  userId: string;
  registrationNumber: string;
  currentXp: number;
  level: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherEntity {
  id: string;
  userId: string;
  specialty?: string | null;
  biography?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DirectorEntity {
  id: string;
  userId: string;
  department?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CourseModule {
  id: string;
  orderIndex: number;
  title: string;
  description: string;
  workloadHours: number;
  topics: string[];
}

export interface CourseEntity {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  workloadHours: number;
  status: ClassStatus;
  category?: string;
  partnerCertification?: string | null;
  modality?: string;
  modules?: CourseModule[];
  createdAt: string;
  updatedAt: string;
}

export interface ClassEntity {
  id: string;
  name: string;
  code: string;
  courseId: string;
  teacherId?: string | null;
  startDate: string;
  endDate?: string | null;
  daysOfWeek: string; // "TER,QUI" or "SAB"
  scheduleTime: string; // "19:00 - 22:00"
  durationMinutes: number;
  lessonsPerWeek: number;
  status: ClassStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentEntity {
  id: string;
  studentId: string;
  classId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface LessonEntity {
  id: string;
  classId: string;
  teacherId?: string | null;
  lessonNumber: number;
  title: string;
  date: string;
  scheduleTime: string;
  durationMinutes: number;
  plannedContent: string;
  actualContent?: string | null;
  materials?: string | null;
  activities?: string | null;
  observations?: string | null;
  status: LessonStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LessonContentEntity {
  id: string;
  lessonId: string;
  title: string;
  description?: string | null;
  contentType: ContentType;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceEntity {
  id: string;
  lessonId: string;
  studentId: string;
  status: AttendanceStatus;
  requestedAt: string;
  confirmedAt?: string | null;
  confirmedById?: string | null;
  rejectionReason?: string | null;
  justificationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PointTransactionEntity {
  id: string;
  studentId: string;
  amount: number;
  type: PointType;
  description: string;
  originReference?: string | null;
  createdAt: string;
}

export interface StreakEntity {
  id: string;
  studentId: string;
  currentStreak: number;
  maxStreak: number;
  lastAttendedLessonId?: string | null;
  lastAttendedDate?: string | null;
  updatedAt: string;
}

export interface BadgeEntity {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  conditionRule: string;
  xpReward: number;
  createdAt: string;
}

export interface StudentBadgeEntity {
  id: string;
  studentId: string;
  badgeId: string;
  earnedAt: string;
}

export interface GamificationRuleEntity {
  id: string;
  code: string;
  name: string;
  xpValue: number;
  description?: string | null;
  isActive: boolean;
  updatedAt: string;
}
