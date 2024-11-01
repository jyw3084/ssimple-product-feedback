const renderType = (type: string) => {
	if (type === 'bug') {
		return 'bug';
	}
	if (type === 'feature') {
		return 'missing feature';
	}
	if (type === 'improve') {
		return 'improvement';
	}
}

export default function SingleFeedback({ type, data, handleModalOpen }) {
	const time = new Date(data?.created_at);
	if (type === 'feedback') {
		return (
			<tr className="hover:bg-slate-50 transition-colors">
				<td>
					{data?.item_title} <a href={`/roadmap/?item=${data?.item_id}`} target="_blank" className="font-bold text-sky-500 hover:text-sky-600 transition-colors"><i className="fas fa-external-link-alt"></i></a>
				</td>
				<td>
					{data?.content?.length > 50 ? (
						<div className="content">
							<p>{data.content.substring(0, 50) + "..."}</p>
							<button type="button" className="text-sm font-bold text-sky-500 hover:text-sky-600 transition-colors" onClick={() => handleModalOpen('feedback', data._id)}>view</button>
						</div>
					) : (<p>{data?.content}</p>)}
				</td>
				<td>
					{data?.email}
				</td>
				<td>
					{time.toLocaleString()}
				</td>
			</tr>
		);
	}

	if (type === 'submit') {
		return (
			<tr className="hover:bg-slate-50 transition-colors break-words">
				<td>
					<div className="space-x-3 text-gray-400">
						<span><i className="fas fa-caret-up"></i> {data?.votes}</span>
						<span><i className="far fa-comment"></i> {data?.comments?.length}</span>
					</div>
					<button type="button" className="text-sm font-bold text-sky-500 hover:text-sky-600 transition-colors" onClick={() => handleModalOpen('interactions', data._id)}>view/reply</button>
				</td>
				<td>
					<span className="text-gray-400">{renderType(data?.type)}</span>
				</td>
				<td>
					{data?.title} <a href={`/?topic=${data?._id}`} target="_blank" className="font-bold text-sky-500 hover:text-sky-600 transition-colors"><i className="fas fa-external-link-alt"></i></a>
				</td>
				<td>
					{data?.desc?.length > 50 ? (
						<div className="content">
							<p>{data.desc.substring(0, 50) + "..."}</p>
							<button type="button" className="text-sm font-bold text-sky-500 hover:text-sky-600 transition-colors" onClick={() => handleModalOpen('submit', data._id)}>view</button>
						</div>
					) : (<p>{data?.desc}</p>)}
				</td>
				<td>
					{data?.email}
				</td>
				<td>
					<span className="text-gray-400">{time.toLocaleString()}</span>
				</td>
				<td>
					<button type="button" className="px-4 py-2 bg-red-100 hover:bg-red-400 transition-colors rounded font-bold text-red-400 hover:text-white" onClick={() => handleModalOpen('warning', data._id)}>Delete</button>
				</td>
			</tr>
		);
	}

	if (type === 'comment') {
		return (
			<tr className="hover:bg-slate-50 transition-colors break-words">
				<td>
					{data?.content?.length > 50 ? (
						<div className="content">
							<p>{data.content.substring(0, 50) + "..."}</p>
							<button type="button" className="text-sm font-bold text-sky-500 hover:text-sky-600 transition-colors" onClick={() => handleModalOpen('comment', data._id)}>view</button>
						</div>
					) : (<p>{data?.content}</p>)}
				</td>
				<td>
					{data?.email}
				</td>
				<td>
					{data?.submit_title} <a href={`/?topic=${data?.submit_id}`} target="_blank" className="font-bold text-sky-500 hover:text-sky-600 transition-colors"><i className="fas fa-external-link-alt"></i></a>
				</td>
				<td>
					{time.toLocaleString()}
				</td>
			</tr>
		);
	}
}