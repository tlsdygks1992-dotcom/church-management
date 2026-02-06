// 1청년부, 2청년부 교인 명단 업데이트 스크립트
// 실행: node scripts/update-members.mjs

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zikneyjidzovvkmflibo.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_wUmB4hnBmVK0SfoNrhsWfw_LKrhKHVV'

const supabase = createClient(supabaseUrl, supabaseKey)

// 1청년부 (cu1) 교인 명단
const cu1Members = [
  { name: '김효정', phone: '010-3744-4029', birth_date: '2000-04-20', email: null },
  { name: '김선웅', phone: '010-6230-5126', birth_date: '1998-11-08', email: 'sun110829@naver.com' },
  { name: '조민정', phone: '010-5042-0658', birth_date: '1998-02-19', email: 'alswjd12345@naver.com' },
  { name: '김동욱', phone: '010-7471-6881', birth_date: '2001-02-01', email: null },
  { name: '이현진', phone: '010-2943-2263', birth_date: '2003-01-06', email: null },
  { name: '김채현', phone: '010-9436-8780', birth_date: '1999-05-21', email: null },
  { name: '현수빈', phone: null, birth_date: null, email: null },
  { name: '송준선', phone: '010-5839-0191', birth_date: '1999-04-13', email: null },
  { name: '이승재', phone: '010-2445-7593', birth_date: null, email: null },
  { name: '김은수', phone: '010-9965-0179', birth_date: '2001-12-16', email: null },
  { name: '한수연', phone: '010-6605-2347', birth_date: '2002-07-18', email: null },
  { name: '임채승', phone: '010-4541-3191', birth_date: '2002-04-08', email: 'gkdnwj12@naver.com' },
  { name: '정시후', phone: '010-9217-3708', birth_date: '2002-01-09', email: null },
  { name: '정은재', phone: '010-4940-3113', birth_date: '2002-07-19', email: null },
  { name: '박준수', phone: '010-4107-7926', birth_date: '1999-09-28', email: null },
  { name: '정예은', phone: '010-4428-6610', birth_date: '2005-01-14', email: null },
  { name: '정성모', phone: '010-4435-6610', birth_date: '1999-03-11', email: null },
  { name: '김재우', phone: '010-2674-6562', birth_date: '1997-06-05', email: null },
  { name: '김민지', phone: '010-2557-0319', birth_date: '2005-03-19', email: 'imingi5757@naver.com' },
  { name: '김지솔', phone: '010-9285-0325', birth_date: '2005-09-17', email: null },
  { name: '장성재', phone: '010-2121-9662', birth_date: '2006-02-17', email: null },
  { name: '장미화', phone: '010-3858-9662', birth_date: '2001-09-15', email: null },
  { name: '구예린', phone: '010-2729-9997', birth_date: '2006-08-25', email: 'yerin-0825@naver.com' },
  { name: '김영효', phone: '010-5658-3439', birth_date: '2000-09-02', email: 'rladudhy@naver.com' },
  { name: '우현승', phone: '010-8873-7371', birth_date: '2005-05-12', email: null },
  { name: '박수빈', phone: '010-9367-3316', birth_date: '2002-03-13', email: null },
  { name: '김현주', phone: '010-2047-9391', birth_date: '1999-03-31', email: null },
  { name: '신원주', phone: '010-5215-9506', birth_date: '2004-07-19', email: null },
  { name: '강민아', phone: '010-2790-1443', birth_date: '1999-05-14', email: null },
  { name: '이다희', phone: '010-7683-1886', birth_date: '2001-06-12', email: null },
  { name: '이태희', phone: '010-5460-5772', birth_date: '2001-01-27', email: 'leephil0127@gmail.com' },
  { name: '김동혁', phone: null, birth_date: null, email: null },
  { name: '이지욱', phone: null, birth_date: null, email: null },
  { name: '박승조', phone: null, birth_date: null, email: null },
  { name: '구현서', phone: null, birth_date: null, email: null },
]

// 2청년부 (cu2) 교인 명단
const cu2Members = [
  { name: '권성경', phone: '010-9747-2020', birth_date: '1996-09-25', email: null },
  { name: '김유창', phone: '010-7130-3401', birth_date: '1996-09-26', email: null },
  { name: '김준일', phone: '010-8784-6948', birth_date: '1995-01-01', email: null },
  { name: '동은희', phone: '010-8199-1785', birth_date: '1994-01-22', email: null },
  { name: '신요한', phone: '010-7767-5442', birth_date: '1992-04-09', email: null },
  { name: '유하은', phone: '010-4147-9523', birth_date: '1995-02-03', email: null },
  { name: '김민혁', phone: '010-3980-3439', birth_date: '1996-11-26', email: null },
  { name: '김윤교', phone: '010-5833-7246', birth_date: '1992-02-21', email: null },
  { name: '송준호', phone: '010-6761-0191', birth_date: '1997-02-27', email: null },
  { name: '이건영', phone: '010-2146-9559', birth_date: '1995-03-13', email: null },
  { name: '이원석', phone: '010-6349-0362', birth_date: '1997-01-06', email: null },
  { name: '임승빈', phone: '010-3808-2706', birth_date: '1995-05-02', email: null },
  { name: '임채원', phone: '010-7745-0640', birth_date: '1992-10-24', email: null },
  { name: '정시온', phone: '010-8880-3113', birth_date: '1997-03-04', email: null },
]

async function getDepartmentId(code) {
  const { data, error } = await supabase
    .from('departments')
    .select('id')
    .eq('code', code)
    .single()

  if (error) {
    console.error(`부서 조회 실패 (${code}):`, error.message)
    return null
  }
  return data?.id
}

async function addMember(member, departmentId) {
  // 먼저 이름+전화번호로 기존 교인 확인
  let existingMember = null
  if (member.phone) {
    const { data } = await supabase
      .from('members')
      .select('id')
      .eq('name', member.name)
      .eq('phone', member.phone)
      .single()
    existingMember = data
  }

  if (existingMember) {
    // 기존 교인이 있으면 부서만 추가
    console.log(`  [기존] ${member.name} - 부서 연결`)

    // 기존 부서 연결 확인
    const { data: existingDept } = await supabase
      .from('member_departments')
      .select('id')
      .eq('member_id', existingMember.id)
      .eq('department_id', departmentId)
      .single()

    if (!existingDept) {
      await supabase
        .from('member_departments')
        .insert({
          member_id: existingMember.id,
          department_id: departmentId,
          is_primary: true
        })
    }
    return
  }

  // 새 교인 추가
  const { data: newMember, error: memberError } = await supabase
    .from('members')
    .insert({
      name: member.name,
      phone: member.phone,
      birth_date: member.birth_date,
      email: member.email,
      is_active: true
    })
    .select('id')
    .single()

  if (memberError) {
    console.error(`  [실패] ${member.name}:`, memberError.message)
    return
  }

  // 부서 연결
  const { error: deptError } = await supabase
    .from('member_departments')
    .insert({
      member_id: newMember.id,
      department_id: departmentId,
      is_primary: true
    })

  if (deptError) {
    console.error(`  [부서연결 실패] ${member.name}:`, deptError.message)
    return
  }

  console.log(`  [추가] ${member.name}`)
}

async function main() {
  console.log('=== 교인 명단 업데이트 시작 ===\n')

  // 부서 ID 조회
  const cu1Id = await getDepartmentId('cu1')
  const cu2Id = await getDepartmentId('cu2')

  if (!cu1Id || !cu2Id) {
    console.error('부서 ID를 찾을 수 없습니다. 먼저 부서를 생성해주세요.')
    process.exit(1)
  }

  console.log(`cu1 부서 ID: ${cu1Id}`)
  console.log(`cu2 부서 ID: ${cu2Id}\n`)

  // 1청년부 교인 추가
  console.log('--- 1청년부 (cu1) 교인 추가 ---')
  for (const member of cu1Members) {
    await addMember(member, cu1Id)
  }

  console.log(`\n1청년부: ${cu1Members.length}명 처리 완료\n`)

  // 2청년부 교인 추가
  console.log('--- 2청년부 (cu2) 교인 추가 ---')
  for (const member of cu2Members) {
    await addMember(member, cu2Id)
  }

  console.log(`\n2청년부: ${cu2Members.length}명 처리 완료`)

  // 결과 확인
  console.log('\n=== 최종 결과 ===')

  const { data: cu1Count } = await supabase
    .from('member_departments')
    .select('id', { count: 'exact' })
    .eq('department_id', cu1Id)

  const { data: cu2Count } = await supabase
    .from('member_departments')
    .select('id', { count: 'exact' })
    .eq('department_id', cu2Id)

  console.log(`1청년부 총 교인: ${cu1Count?.length || 0}명`)
  console.log(`2청년부 총 교인: ${cu2Count?.length || 0}명`)
}

main().catch(console.error)
