import { useEffect, useState, useCallback } from 'react';
import { 
  fetchRobots, deleteRobot
} from '../api';
import { 
  RefreshCw, 
  Loader 
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { RobotTable, DDModal, InfoModal } from './Comparativo';
import axios from 'axios';

const Banco = () => {
  const [robots, setRobots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ddRobot, setDdRobot] = useState<any>(null);
  const [infoRobot, setInfoRobot] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await fetchRobots(); setRobots(data); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleConfirmPortfolio = (robot: any) => {
    alert(`${robot.name} vinculado ao Portfólio com sucesso!`);
  };

  const handleDelete = async (robot: any) => {
    setConfirmDelete(robot);
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const robot = confirmDelete;
    setActionLoading(robot.id + '_del');
    try { 
      await deleteRobot(robot.id); 
      setRobots(prev => prev.filter(r => r.id !== robot.id)); 
    } catch (err: any) {
      alert(`Erro ao excluir robô: ${err.message || String(err)}`);
    } finally { 
      setActionLoading(null); 
      setConfirmDelete(null);
    }
  };

  const pending = robots.filter(r => r.status === 'pending');
  const approved = robots.filter(r => r.status === 'approved');

  const handleApprove = (robot: any) => {
    setActionLoading(robot.id + '_approve');
    setTimeout(() => {
      setRobots(prev => prev.map(r => r.id === robot.id ? { ...r, status: 'approved' } : r));
      setActionLoading(null);
      handleConfirmPortfolio(robot);
    }, 500);
  };

  return (
    <div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <Loader size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
          <p>Sincronizando repositório...</p>
        </div>
      ) : (
        <>
          <div className="flex-between" style={{ marginBottom: '1.8rem' }}>
            <h1 className="section-title" style={{ margin: 0, fontSize: '1.2rem' }}>Repositório de Estratégias</h1>
            <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '0.8rem' }} onClick={load}><RefreshCw size={13} /> Atualizar</button>
          </div>

          {pending.length > 0 && (
            <section style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ color: 'var(--accent-blue)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '0.8rem' }}>Sessão de Diagnóstico</h2>
              <RobotTable robots={pending} onApprove={handleApprove} onDelete={handleDelete} onDD={setDdRobot} onInfo={setInfoRobot} actionLoading={actionLoading} showApproveBtn={true} />
            </section>
          )}

          {approved.length > 0 && (
            <section>
              <h2 style={{ color: 'var(--accent-green)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '0.8rem' }}>Diagnósticos Aprovados</h2>
              <RobotTable robots={approved} onApprove={handleApprove} onDelete={handleDelete} onDD={setDdRobot} onInfo={setInfoRobot} actionLoading={actionLoading} showApproveBtn={false} />
            </section>
          )}

          {robots.length === 0 && (
            <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.05)' }}>
               <p>Repositório vazio. Aprove robôs no Diagnóstico para arquivá-los aqui.</p>
            </div>
          )}
        </>
      )}

      {ddRobot && <DDModal robot={ddRobot} onClose={() => setDdRobot(null)} />}
      {infoRobot && <InfoModal robot={infoRobot} onClose={() => setInfoRobot(null)} />}
      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Remover do Repositório"
        message={`Deseja remover definitivamente "${confirmDelete?.name}" do repositório?`}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
        confirmLabel="Remover"
      />
    </div>
  );
};

export default Banco;
