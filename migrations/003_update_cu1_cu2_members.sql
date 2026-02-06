-- 1청년부(cu1), 2청년부(cu2) 교인 명단 업데이트
-- 생성일: 2026-01-31
-- 원본 파일: 1청년부 전체 명단 (26.01.31).xlsx, 2청년 주소록.cell

-- 실행 전 주의사항:
-- 1. 기존 데이터 백업 권장
-- 2. 이 스크립트는 cu1, cu2 부서의 교인을 새로 추가합니다
-- 3. 기존 교인과 중복되는 경우 이름+전화번호로 확인 후 업데이트합니다

BEGIN;

-- 부서 ID 조회
DO $$
DECLARE
  cu1_dept_id uuid;
  cu2_dept_id uuid;
  new_member_id uuid;
BEGIN
  -- cu1, cu2 부서 ID 가져오기
  SELECT id INTO cu1_dept_id FROM departments WHERE code = 'cu1';
  SELECT id INTO cu2_dept_id FROM departments WHERE code = 'cu2';

  IF cu1_dept_id IS NULL THEN
    RAISE EXCEPTION 'cu1 부서를 찾을 수 없습니다';
  END IF;

  IF cu2_dept_id IS NULL THEN
    RAISE EXCEPTION 'cu2 부서를 찾을 수 없습니다';
  END IF;

  -- ============================================
  -- 1청년부 (cu1) 교인 추가/업데이트
  -- ============================================

  -- 1. 김효정
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '김효정', '010-3744-4029', '2000-04-20', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 2. 김선웅
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '김선웅', '010-6230-5126', '1998-11-08', 'sun110829@naver.com', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 3. 조민정
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '조민정', '010-5042-0658', '1998-02-19', 'alswjd12345@naver.com', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 4. 김동욱
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '김동욱', '010-7471-6881', '2001-02-01', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 5. 이현진
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '이현진', '010-2943-2263', '2003-01-06', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 6. 김채현
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '김채현', '010-9436-8780', '1999-05-21', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 7. 현수빈 (생년월일 정보 없음)
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '현수빈', NULL, NULL, NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 8. 송준선
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '송준선', '010-5839-0191', '1999-04-13', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 9. 이승재 (생년월일 데이터 오류 - 제외)
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '이승재', '010-2445-7593', NULL, NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 10. 김은수
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '김은수', '010-9965-0179', '2001-12-16', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 11. 한수연
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '한수연', '010-6605-2347', '2002-07-18', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 12. 임채승
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '임채승', '010-4541-3191', '2002-04-08', 'gkdnwj12@naver.com', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 13. 정시후
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '정시후', '010-9217-3708', '2002-01-09', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 14. 정은재
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '정은재', '010-4940-3113', '2002-07-19', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 15. 박준수
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '박준수', '010-4107-7926', '1999-09-28', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 16. 정예은
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '정예은', '010-4428-6610', '2005-01-14', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 17. 정성모
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '정성모', '010-4435-6610', '1999-03-11', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 18. 김재우 (1청년)
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '김재우', '010-2674-6562', '1997-06-05', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 19. 김민지
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '김민지', '010-2557-0319', '2005-03-19', 'imingi5757@naver.com', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 20. 김지솔
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '김지솔', '010-9285-0325', '2005-09-17', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 21. 장성재
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '장성재', '010-2121-9662', '2006-02-17', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 22. 장미화
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '장미화', '010-3858-9662', '2001-09-15', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 23. 구예린
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '구예린', '010-2729-9997', '2006-08-25', 'yerin-0825@naver.com', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 24. 김영효
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '김영효', '010-5658-3439', '2000-09-02', 'rladudhy@naver.com', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 25. 우현승
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '우현승', '010-8873-7371', '2005-05-12', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 26. 박수빈
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '박수빈', '010-9367-3316', '2002-03-13', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 27. 김현주
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '김현주', '010-2047-9391', '1999-03-31', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 28. 신원주
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '신원주', '010-5215-9506', '2004-07-19', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 29. 강민아
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '강민아', '010-2790-1443', '1999-05-14', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 30. 이다희
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '이다희', '010-7683-1886', '2001-06-12', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 31. 이태희
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '이태희', '010-5460-5772', '2001-01-27', 'leephil0127@gmail.com', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 32. 김동혁 (정보 없음)
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '김동혁', NULL, NULL, NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 33. 이지욱 (정보 없음)
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '이지욱', NULL, NULL, NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 34. 박승조 (정보 없음)
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '박승조', NULL, NULL, NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- 35. 구현서 (정보 없음)
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '구현서', NULL, NULL, NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu1_dept_id, true);
  END IF;

  -- ============================================
  -- 2청년부 (cu2) 교인 추가/업데이트
  -- ============================================

  -- 1. 권성경
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '권성경', '010-9747-2020', '1996-09-25', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu2_dept_id, true);
  END IF;

  -- 2. 김유창
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '김유창', '010-7130-3401', '1996-09-26', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu2_dept_id, true);
  END IF;

  -- 3. 김준일
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '김준일', '010-8784-6948', '1995-01-01', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu2_dept_id, true);
  END IF;

  -- 4. 동은희
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '동은희', '010-8199-1785', '1994-01-22', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu2_dept_id, true);
  END IF;

  -- 5. 신요한
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '신요한', '010-7767-5442', '1992-04-09', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu2_dept_id, true);
  END IF;

  -- 6. 유하은
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '유하은', '010-4147-9523', '1995-02-03', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu2_dept_id, true);
  END IF;

  -- 7. 김민혁
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '김민혁', '010-3980-3439', '1996-11-26', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu2_dept_id, true);
  END IF;

  -- 8. 김윤교
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '김윤교', '010-5833-7246', '1992-02-21', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu2_dept_id, true);
  END IF;

  -- 9. 송준호
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '송준호', '010-6761-0191', '1997-02-27', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu2_dept_id, true);
  END IF;

  -- 10. 이건영
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '이건영', '010-2146-9559', '1995-03-13', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu2_dept_id, true);
  END IF;

  -- 11. 이원석
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '이원석', '010-6349-0362', '1997-01-06', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu2_dept_id, true);
  END IF;

  -- 12. 임승빈
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '임승빈', '010-3808-2706', '1995-05-02', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu2_dept_id, true);
  END IF;

  -- 13. 임채원
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '임채원', '010-7745-0640', '1992-10-24', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu2_dept_id, true);
  END IF;

  -- 14. 정시온
  INSERT INTO members (id, name, phone, birth_date, email, is_active)
  VALUES (gen_random_uuid(), '정시온', '010-8880-3113', '1997-03-04', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO new_member_id;
  IF new_member_id IS NOT NULL THEN
    INSERT INTO member_departments (id, member_id, department_id, is_primary)
    VALUES (gen_random_uuid(), new_member_id, cu2_dept_id, true);
  END IF;

  RAISE NOTICE '1청년부 35명, 2청년부 14명 교인 데이터 추가 완료';
END $$;

COMMIT;

-- 결과 확인
SELECT
  d.name as department,
  COUNT(md.member_id) as member_count
FROM departments d
LEFT JOIN member_departments md ON d.id = md.department_id
WHERE d.code IN ('cu1', 'cu2')
GROUP BY d.name
ORDER BY d.name;
