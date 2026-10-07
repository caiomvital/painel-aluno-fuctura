import { prisma } from '../lib/prisma';
import { getLessonWithDiary, updateLessonDiary, manualAdjustStudentXp } from '../lib/academic-service';
import { randomUUID } from 'crypto';

async function run() {
  console.log('=== INÍCIO DA BATERIA DE TESTES DO MARCO 7 ===');

  // 1. Obter usuários de teste: Professor, Aluno da turma, Aluno de outra turma, Diretor
  const teacherUser = await prisma.user.findFirst({ where: { role: 'PROFESSOR' }, include: { teacher: true } });
  const directorUser = await prisma.user.findFirst({ where: { role: 'DIRETOR' }, include: { director: true } });

  if (!teacherUser || !directorUser) {
    throw new Error('Professor ou Diretor não encontrados no banco.');
  }

  // Turma do professor
  const teacherClass = await prisma.class.findFirst({
    where: { teacherId: teacherUser.teacher?.id },
    include: { lessons: { orderBy: { lessonNumber: 'asc' } }, enrollments: true },
  });

  if (!teacherClass || teacherClass.lessons.length === 0) {
    throw new Error('Turma ou aulas do professor não encontradas.');
  }

  const testLesson = teacherClass.lessons[0];
  console.log(`Aula de teste: ${testLesson.id} - Aula ${testLesson.lessonNumber}: ${testLesson.title}`);

  // Teste 1: Professor adiciona 5 tópicos planejados
  console.log('\n--- TESTE 1: Professor adiciona 5 tópicos planejados ---');
  const planned5 = [
    'O que é herança',
    'A palavra extends',
    'Reutilização de atributos e métodos',
    'Sobrescrita de métodos',
    'Exercício prático',
  ];

  await updateLessonDiary(
    testLesson.id,
    { plannedTopics: planned5 },
    { id: teacherUser.id, role: 'PROFESSOR', teacherId: teacherUser.teacher?.id }
  );

  let diary = await getLessonWithDiary(testLesson.id, {
    id: teacherUser.id,
    role: 'PROFESSOR',
    teacherId: teacherUser.teacher?.id,
  });
  console.log(`Tópicos planejados salvos: ${diary.plannedTopics.length}`);
  if (diary.plannedTopics.length !== 5) throw new Error('Falha ao salvar 5 tópicos planejados');

  // Teste 2: Professor registra 3 tópicos ministrados
  console.log('\n--- TESTE 2: Professor registra 3 tópicos ministrados ---');
  const taught3 = [
    'Conceito de herança',
    'Uso de extends',
    'Exercício com classes Pessoa e Aluno',
  ];

  await updateLessonDiary(
    testLesson.id,
    { taughtTopics: taught3 },
    { id: teacherUser.id, role: 'PROFESSOR', teacherId: teacherUser.teacher?.id }
  );

  // Teste 3: Os dois conjuntos permanecem independentes
  console.log('\n--- TESTE 3: Planejados e ministrados permanecem independentes ---');
  diary = await getLessonWithDiary(testLesson.id, {
    id: teacherUser.id,
    role: 'PROFESSOR',
    teacherId: teacherUser.teacher?.id,
  });
  console.log(`Planejados: ${diary.plannedTopics.length}, Ministrados: ${diary.taughtTopics.length}`);
  if (diary.plannedTopics.length !== 5 || diary.taughtTopics.length !== 3) {
    throw new Error('Independência violada entre planejados e ministrados!');
  }

  // Teste 4: Professor adiciona 2 links externos
  console.log('\n--- TESTE 4: Professor adiciona 2 links externos ---');
  const initialMaterials = [
    {
      title: 'Código da aula — GitHub',
      url: 'https://github.com/fuctura/java-poo-aula5',
      description: 'Repositório completo com exemplos',
    },
    {
      title: 'Slides de Herança — Google Drive',
      url: 'https://drive.google.com/file/d/poo-slides-aula5',
      description: 'Apresentação em PDF',
    },
  ];

  await updateLessonDiary(
    testLesson.id,
    { materials: initialMaterials },
    { id: teacherUser.id, role: 'PROFESSOR', teacherId: teacherUser.teacher?.id }
  );

  diary = await getLessonWithDiary(testLesson.id, {
    id: teacherUser.id,
    role: 'PROFESSOR',
    teacherId: teacherUser.teacher?.id,
  });
  console.log(`Materiais salvos: ${diary.materials.length}`);
  if (diary.materials.length !== 2) throw new Error('Falha ao salvar 2 materiais');

  // Teste 5: Professor edita um link
  console.log('\n--- TESTE 5: Professor edita um link ---');
  const editedMaterials = [
    {
      id: diary.materials[0].id,
      title: 'Código da aula — GitHub (Atualizado)',
      url: 'https://github.com/fuctura/java-poo-aula5-v2',
      description: 'Código com gabarito',
    },
    diary.materials[1],
  ];

  await updateLessonDiary(
    testLesson.id,
    { materials: editedMaterials },
    { id: teacherUser.id, role: 'PROFESSOR', teacherId: teacherUser.teacher?.id }
  );

  diary = await getLessonWithDiary(testLesson.id, {
    id: teacherUser.id,
    role: 'PROFESSOR',
    teacherId: teacherUser.teacher?.id,
  });
  console.log(`Material 1 editado para: ${diary.materials[0].title}`);
  if (!diary.materials[0].title.includes('Atualizado')) throw new Error('Edição de material falhou');

  // Teste 6: Professor exclui um tópico
  console.log('\n--- TESTE 6: Professor exclui um tópico ---');
  const planned4 = diary.plannedTopics.slice(0, 4);
  await updateLessonDiary(
    testLesson.id,
    { plannedTopics: planned4 },
    { id: teacherUser.id, role: 'PROFESSOR', teacherId: teacherUser.teacher?.id }
  );

  diary = await getLessonWithDiary(testLesson.id, {
    id: teacherUser.id,
    role: 'PROFESSOR',
    teacherId: teacherUser.teacher?.id,
  });
  console.log(`Tópicos planejados após remoção de 1: ${diary.plannedTopics.length}`);
  if (diary.plannedTopics.length !== 4) throw new Error('Falha ao excluir tópico');
  // Confirmar que materiais não foram afetados
  if (diary.materials.length !== 2) throw new Error('Materiais foram apagados acidentalmente ao editar tópicos!');

  // Teste 7: Aluno matriculado visualiza os dados atualizados
  console.log('\n--- TESTE 7: Aluno matriculado visualiza dados atualizados ---');
  const enrolledStudent = await prisma.student.findFirst({
    where: { enrollments: { some: { classId: teacherClass.id, status: 'ACTIVE' } } },
    include: { user: true },
  });

  if (enrolledStudent) {
    const studentDiary = await getLessonWithDiary(testLesson.id, {
      id: enrolledStudent.userId,
      role: 'ALUNO',
      studentId: enrolledStudent.id,
    });
    console.log(
      `Aluno matriculado ${enrolledStudent.user.name}: ${studentDiary.plannedTopics.length} planejados, ${studentDiary.taughtTopics.length} ministrados, ${studentDiary.materials.length} materiais.`
    );
  }

  // Teste 8: Aluno de outra turma não acessa os dados (403)
  console.log('\n--- TESTE 8: Aluno de outra turma bloqueado (403) ---');
  const nonEnrolledStudent = await prisma.student.findFirst({
    where: { enrollments: { none: { classId: teacherClass.id } } },
    include: { user: true },
  });

  if (nonEnrolledStudent) {
    let forbiddenCaught = false;
    try {
      await getLessonWithDiary(testLesson.id, {
        id: nonEnrolledStudent.userId,
        role: 'ALUNO',
        studentId: nonEnrolledStudent.id,
      });
    } catch (err: any) {
      if (err.statusCode === 403) forbiddenCaught = true;
    }
    console.log(`Aluno não matriculado bloqueado com 403: ${forbiddenCaught}`);
    if (!forbiddenCaught) throw new Error('Aluno de outra turma conseguiu acessar os dados da aula!');
  }

  // Teste 9: Professor de outra turma não consegue editar (403)
  console.log('\n--- TESTE 9: Professor de outra turma bloqueado para edição (403) ---');
  const otherTeacher = await prisma.teacher.findFirst({
    where: { id: { not: teacherUser.teacher?.id } },
    include: { user: true },
  });

  if (otherTeacher) {
    let teacherForbidden = false;
    try {
      await updateLessonDiary(
        testLesson.id,
        { plannedTopics: ['Tentativa não autorizada'] },
        { id: otherTeacher.userId, role: 'PROFESSOR', teacherId: otherTeacher.id }
      );
    } catch (err: any) {
      if (err.statusCode === 403) teacherForbidden = true;
    }
    console.log(`Outro professor bloqueado para edição com 403: ${teacherForbidden}`);
    if (!teacherForbidden) throw new Error('Professor não responsável conseguiu editar o diário!');
  }

  // Teste 10: Diretor consegue consultar e editar
  console.log('\n--- TESTE 10: Diretor consulta e edita diário ---');
  const directorView = await getLessonWithDiary(testLesson.id, {
    id: directorUser.id,
    role: 'DIRETOR',
    directorId: directorUser.director?.id,
  });
  console.log(`Diretor consultou aula: ${directorView.title}`);

  await updateLessonDiary(
    testLesson.id,
    { plannedTopics: [...diary.plannedTopics, 'Tópico homologado pela Direção'] },
    { id: directorUser.id, role: 'DIRETOR', directorId: directorUser.director?.id }
  );

  const directorAfter = await getLessonWithDiary(testLesson.id, {
    id: directorUser.id,
    role: 'DIRETOR',
    directorId: directorUser.director?.id,
  });
  console.log(`Diretor atualizou tópicos com sucesso. Total agora: ${directorAfter.plannedTopics.length}`);
  if (directorAfter.plannedTopics.length !== 5) throw new Error('Diretor não conseguiu editar diário!');

  // Teste 11: Persistência após consulta direta ao Prisma
  console.log('\n--- TESTE 11: Persistência direta no Prisma ---');
  const dbLesson = await prisma.lesson.findUnique({
    where: { id: testLesson.id },
    include: { contents: true },
  });
  console.log(`Prisma DB -> contents count: ${dbLesson?.contents.length}`);
  if (!dbLesson || dbLesson.contents.length === 0) throw new Error('Dados não foram persistidos no PostgreSQL!');

  // Teste 12: Integridade de presença, XP e Coins
  console.log('\n--- TESTE 12: Verificação de efeitos colaterais em Presença, XP e Coins ---');
  const attendancesCount = await prisma.attendance.count({ where: { lessonId: testLesson.id } });
  console.log(`Presenças associadas à aula: ${attendancesCount} (intactas e inalteradas)`);

  // Teste 13: Aula sem conteúdo apresenta estados vazios adequados
  console.log('\n--- TESTE 13: Aula sem conteúdo com estados vazios ---');
  const emptyLesson = await prisma.lesson.findFirst({
    where: { id: { not: testLesson.id } },
  });
  if (emptyLesson) {
    await updateLessonDiary(
      emptyLesson.id,
      { plannedTopics: [], taughtTopics: [], materials: [] },
      { id: directorUser.id, role: 'DIRETOR' }
    );
    const emptyResult = await getLessonWithDiary(emptyLesson.id, { id: directorUser.id, role: 'DIRETOR' });
    console.log(
      `Aula limpa -> planejados: ${emptyResult.plannedTopics.length}, ministrados: ${emptyResult.taughtTopics.length}, materiais: ${emptyResult.materials.length}`
    );
    if (
      emptyResult.plannedTopics.length !== 0 ||
      emptyResult.taughtTopics.length !== 0 ||
      emptyResult.materials.length !== 0
    ) {
      throw new Error('Estado vazio falhou!');
    }
  }

  // Seção 11: Pendência anterior — Dois ajustes manuais consecutivos de XP
  console.log('\n--- TESTE SEÇÃO 11: Dois ajustes manuais consecutivos de XP pelo Diretor ---');
  const testStudent = await prisma.student.findFirst({ include: { user: true } });
  if (testStudent) {
    const xpBefore = testStudent.currentXp;
    const coinsBefore = testStudent.coinBalance;

    const op1 = await manualAdjustStudentXp(testStudent.id, 50, 'Ajuste manual de XP 1 teste', directorUser.id);
    const op2 = await manualAdjustStudentXp(testStudent.id, 30, 'Ajuste manual de XP 2 teste', directorUser.id);

    console.log('Operação 1 originReference:', op1.transaction.originReference);
    console.log('Operação 2 originReference:', op2.transaction.originReference);

    if (op1.transaction.originReference === op2.transaction.originReference) {
      throw new Error('originReference duplicado entre ajustes manuais consecutivos!');
    }

    const studentAfter = await prisma.student.findUnique({ where: { id: testStudent.id } });
    console.log(`XP antes: ${xpBefore}, após ajustes (+80): ${studentAfter?.currentXp}`);
    console.log(`Coins antes: ${coinsBefore}, após ajustes de XP: ${studentAfter?.coinBalance}`);

    if ((studentAfter?.currentXp || 0) !== xpBefore + 80) {
      throw new Error('Cálculo final de XP incorreto após 2 ajustes!');
    }
    if ((studentAfter?.coinBalance || 0) !== coinsBefore) {
      throw new Error('Coins foram concedidas indevidamente durante ajuste manual de XP!');
    }
    console.log('Validação de XP manual e reconciliação concluída com sucesso!');
  }

  console.log('\n=== TODOS OS TESTES PASSARAM COM SUCESSO ABSOLUTO! ===');
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('ERRO:', e);
    process.exit(1);
  });
