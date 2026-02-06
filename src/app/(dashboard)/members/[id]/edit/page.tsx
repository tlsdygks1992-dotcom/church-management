'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MemberForm from '@/components/members/MemberForm'
import Link from 'next/link'

interface Department {
  id: string
  name: string
}

interface MemberDepartmentData {
  department_id: string
  is_primary: boolean
  departments: {
    id: string
    name: string
  }
}

interface Member {
  id: string
  name: string
  phone: string | null
  email: string | null
  birth_date: string | null
  address: string | null
  occupation: string | null
  photo_url: string | null
  photo_updated_at: string | null
  department_id: string | null
  is_active: boolean
  joined_at: string
  created_at: string
  updated_at: string
  member_departments: MemberDepartmentData[]
}

export default function MemberEditPage() {
  const params = useParams()
  const router = useRouter()
  const [member, setMember] = useState<Member | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    // 현재 사용자 권한 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    // 관리자 권한 체크 (super_admin, president, accountant, team_leader)
    const adminRoles = ['super_admin', 'president', 'accountant', 'team_leader']
    if (!userData || !adminRoles.includes(userData.role)) {
      router.push('/members')
      return
    }
    setCanEdit(true)

    // 교인 정보 로드
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('*, member_departments(department_id, is_primary, departments(id, name))')
      .eq('id', params.id)
      .single()

    if (memberError || !memberData) {
      console.error('Error loading member:', memberError)
      router.push('/members')
      return
    }

    // 부서 목록 로드
    const { data: deptData } = await supabase
      .from('departments')
      .select('id, name')
      .order('name')

    setMember(memberData as Member)
    setDepartments(deptData || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!canEdit || !member) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">접근 권한이 없습니다.</p>
        <Link href="/members" className="text-blue-600 hover:underline mt-4 inline-block">
          목록으로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/members/${params.id}`} className="text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          돌아가기
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">교인 정보 수정</h1>

      <MemberForm departments={departments} member={member} />
    </div>
  )
}
