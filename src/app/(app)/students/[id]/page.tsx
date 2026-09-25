import StudentsView from '@/components/students/StudentsView'

export default function Page({ params }: { params: { id: string } }) {
  return <StudentsView openStudentId={params.id} />
}
