import StudentPage from '@/components/students/StudentPage'

export default function Page({ params }: { params: { id: string } }) {
  return <StudentPage studentId={params.id} />
}
