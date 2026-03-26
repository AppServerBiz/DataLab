import React from 'react';
import { BarChart, Activity, DollarSign, Command } from 'lucide-react';

const Home = () => {
  return (
    <div>
      <h1 className="section-title">Visão Geral</h1>
      
      <div className="grid-cards">
        <div className="card">
          <div className="flex-between">
            <h2 className="card-title">Robôs Processados</h2>
            <Command size={24} className="text-blue" />
          </div>
          <div className="value-highlight">142</div>
          <p className="text-muted">+12% este mês</p>
        </div>

        <div className="card">
          <div className="flex-between">
            <h2 className="card-title">Lucro Total Global</h2>
            <DollarSign size={24} className="text-green" />
          </div>
          <div className="value-highlight text-profit">+$ 84,209.11</div>
          <p className="text-muted">Todos EAs Ativos</p>
        </div>

        <div className="card">
          <div className="flex-between">
            <h2 className="card-title">Drawdown Máximo</h2>
            <Activity size={24} className="text-red" />
          </div>
          <div className="value-highlight text-loss">-4.2%</div>
          <p className="text-muted">Dentro do limite Oakmont</p>
        </div>
        
        <div className="card">
          <div className="flex-between">
            <h2 className="card-title">Total Negociações</h2>
            <BarChart size={24} className="text-blue" />
          </div>
          <div className="value-highlight">9,341</div>
          <p className="text-muted">Win Rate: 68.3%</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
